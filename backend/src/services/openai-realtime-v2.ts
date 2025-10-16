/**
 * OpenAI Realtime API Proxy - Version 2
 * 
 * This version uses the session-based approach:
 * 1. Create a session via REST API to get ephemeral key
 * 2. Use the ephemeral key to connect via WebSocket
 * 
 * This approach is more reliable and follows OpenAI's recommended pattern.
 */

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  OpenAIRealtimeConfig,
  ProxySessionConfig,
  ClientToServerEvent,
  ServerToClientEvent,
} from '../types/openai-realtime';

interface RealtimeSession {
  id: string;
  object: string;
  model: string;
  modalities: string[];
  instructions: string;
  voice: string;
  input_audio_format: string;
  output_audio_format: string;
  input_audio_transcription: any;
  turn_detection: any;
  tools: any[];
  tool_choice: string;
  temperature: number;
  max_response_output_tokens: number | string;
  client_secret: {
    value: string;
    expires_at: number;
  };
}

export class OpenAIRealtimeProxyV2 {
  private openaiWs: WebSocket | null = null;
  private clientWs: WebSocket | null = null;
  private sessionId: string;
  private config: OpenAIRealtimeConfig;
  private sessionConfig: ProxySessionConfig;
  private isConnected: boolean = false;
  private realtimeSession: RealtimeSession | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    clientWs: WebSocket,
    config: OpenAIRealtimeConfig,
    sessionConfig: ProxySessionConfig
  ) {
    this.clientWs = clientWs;
    this.config = config;
    this.sessionConfig = sessionConfig;
    this.sessionId = uuidv4();

    this.setupClientHandlers();
  }

  private setupClientHandlers() {
    if (!this.clientWs) return;

    this.clientWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(message);
      } catch (error) {
        console.error('Failed to parse client message:', error);
        this.sendErrorToClient('Invalid message format');
      }
    });

    this.clientWs.on('close', () => {
      console.log(`🔌 Client disconnected from session ${this.sessionId}`);
      this.cleanup();
    });

    this.clientWs.on('error', (error) => {
      console.error(`Client WebSocket error in session ${this.sessionId}:`, error);
      this.cleanup();
    });
  }

  /**
   * Step 1: Create a Realtime session via REST API
   */
  private async createRealtimeSession(): Promise<RealtimeSession | null> {
    try {
      console.log(`🔑 Creating Realtime session for ${this.sessionId}...`);

      const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.sessionConfig.model || 'gpt-4o-realtime-preview-2024-12-17',
          voice: this.sessionConfig.voice || 'verse',
          instructions: this.sessionConfig.instructions || 'You are a helpful AI assistant.',
          modalities: this.sessionConfig.modalities || ['text', 'audio'],
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: this.sessionConfig.turnDetection || {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          temperature: this.sessionConfig.temperature || 0.8,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to create session: ${response.status} ${response.statusText}`);
        console.error(`   Error: ${errorText}`);
        return null;
      }

      const session: RealtimeSession = await response.json();
      console.log(`✅ Session created: ${session.id}`);
      console.log(`   Ephemeral key: ${session.client_secret.value.substring(0, 20)}...`);
      console.log(`   Expires at: ${new Date(session.client_secret.expires_at * 1000).toISOString()}`);

      return session;
    } catch (error) {
      console.error(`❌ Error creating Realtime session:`, error);
      return null;
    }
  }

  /**
   * Step 2: Connect to WebSocket using ephemeral key
   */
  private async connectWebSocket(ephemeralKey: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = 'wss://api.openai.com/v1/realtime';

        console.log(`🔗 Connecting to OpenAI Realtime WebSocket for session ${this.sessionId}...`);

        this.openaiWs = new WebSocket(wsUrl, {
          headers: {
            'Authorization': `Bearer ${ephemeralKey}`,
            'OpenAI-Beta': 'realtime=v1',
          },
        });

        const timeout = setTimeout(() => {
          console.error('❌ WebSocket connection timeout');
          this.openaiWs?.close();
          reject(new Error('Connection timeout'));
        }, 15000);

        this.openaiWs.on('open', () => {
          clearTimeout(timeout);
          console.log(`✅ Connected to OpenAI Realtime WebSocket for session ${this.sessionId}`);
          this.isConnected = true;

          this.setupOpenAIHandlers();
          this.startHeartbeat();

          // Send initial session configuration
          this.sendSessionUpdate();

          resolve(true);
        });

        this.openaiWs.on('error', (error) => {
          clearTimeout(timeout);
          console.error(`❌ OpenAI WebSocket error in session ${this.sessionId}:`, error);
          reject(error);
        });

        this.openaiWs.on('close', (code, reason) => {
          clearTimeout(timeout);
          console.log(`🔌 OpenAI connection closed for session ${this.sessionId}: ${code} ${reason.toString()}`);
          this.isConnected = false;
          this.stopHeartbeat();

          if (code !== 1000) {
            reject(new Error(`Connection closed: ${code} ${reason}`));
          }
        });
      } catch (error) {
        console.error(`❌ Failed to create WebSocket:`, error);
        reject(error);
      }
    });
  }

  /**
   * Main connect method - combines both steps
   */
  public async connect(): Promise<boolean> {
    try {
      // Step 1: Create session and get ephemeral key
      this.realtimeSession = await this.createRealtimeSession();
      
      if (!this.realtimeSession || !this.realtimeSession.client_secret) {
        this.sendErrorToClient('Failed to create Realtime session');
        return false;
      }

      // Step 2: Connect WebSocket with ephemeral key
      const connected = await this.connectWebSocket(this.realtimeSession.client_secret.value);
      
      if (connected) {
        this.sendToClient({
          type: 'session.created',
          session: {
            id: this.realtimeSession.id,
            model: this.realtimeSession.model,
            voice: this.realtimeSession.voice,
            modalities: this.realtimeSession.modalities,
          },
        });
      }

      return connected;
    } catch (error) {
      console.error(`❌ Failed to connect to OpenAI for session ${this.sessionId}:`, error);
      this.sendErrorToClient('Failed to connect to OpenAI Realtime API');
      return false;
    }
  }

  private setupOpenAIHandlers() {
    if (!this.openaiWs) return;

    this.openaiWs.on('message', (data) => {
      try {
        const event: ServerToClientEvent = JSON.parse(data.toString());
        console.log(`📨 OpenAI → Client: ${event.type}`);
        
        // Forward all events to client
        this.sendToClient(event);
      } catch (error) {
        console.error('Failed to parse OpenAI message:', error);
      }
    });
  }

  private sendSessionUpdate() {
    if (!this.openaiWs || !this.isConnected) return;

    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: this.sessionConfig.modalities || ['text', 'audio'],
        instructions: this.sessionConfig.instructions || 'You are a helpful AI assistant.',
        voice: this.sessionConfig.voice || 'verse',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: this.sessionConfig.turnDetection || {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        temperature: this.sessionConfig.temperature || 0.8,
      },
    };

    console.log(`📤 Sending session.update`);
    this.openaiWs.send(JSON.stringify(sessionUpdate));
  }

  private handleClientMessage(message: ClientToServerEvent) {
    console.log(`📨 Client → OpenAI: ${message.type}`);

    if (!this.isConnected || !this.openaiWs) {
      this.sendErrorToClient('Not connected to OpenAI');
      return;
    }

    // Forward message to OpenAI
    this.openaiWs.send(JSON.stringify(message));
  }

  private sendToClient(data: any) {
    if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
      this.clientWs.send(JSON.stringify(data));
    }
  }

  private sendErrorToClient(message: string) {
    this.sendToClient({
      type: 'error',
      error: {
        type: 'server_error',
        message,
      },
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.openaiWs && this.openaiWs.readyState === WebSocket.OPEN) {
        this.openaiWs.ping();
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public cleanup() {
    console.log(`🧹 Cleaning up session ${this.sessionId}`);
    
    this.stopHeartbeat();

    if (this.openaiWs) {
      this.openaiWs.close();
      this.openaiWs = null;
    }

    if (this.clientWs) {
      this.clientWs.close();
      this.clientWs = null;
    }

    this.isConnected = false;
  }
}

