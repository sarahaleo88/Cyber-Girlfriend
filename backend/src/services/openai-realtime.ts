import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  OpenAIRealtimeConfig,
  ProxySessionConfig,
  ClientToServerEvent,
  ServerToClientEvent,
  SessionUpdateEvent,
  InputAudioBufferAppendEvent,
  ResponseCreateEvent,
} from '../types/openai-realtime';

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

interface RateLimiter {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

interface ReconnectionConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class OpenAIRealtimeProxy {
  private openaiWs: WebSocket | null = null;
  private clientWs: WebSocket | null = null;
  private sessionId: string;
  private config: OpenAIRealtimeConfig;
  private sessionConfig: ProxySessionConfig;
  private isConnected: boolean = false;
  private circuitBreaker: CircuitBreakerState;
  private rateLimiter: RateLimiter;
  private reconnectionConfig: ReconnectionConfig;
  private reconnectionAttempts: number = 0;
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();

  constructor(
    clientWs: WebSocket,
    config: OpenAIRealtimeConfig,
    sessionConfig: ProxySessionConfig
  ) {
    this.clientWs = clientWs;
    this.config = config;
    this.sessionConfig = sessionConfig;
    this.sessionId = uuidv4();

    // Initialize circuit breaker
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
    };

    // Initialize rate limiter (100 requests per minute)
    this.rateLimiter = {
      tokens: 100,
      lastRefill: Date.now(),
      maxTokens: 100,
      refillRate: 100 / 60, // 100 tokens per 60 seconds
    };

    // Initialize reconnection config
    this.reconnectionConfig = {
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
    };

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

  public async connect(): Promise<boolean> {
    if (this.circuitBreaker.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure < 30000) { // 30 second timeout
        this.sendErrorToClient('Service temporarily unavailable');
        return false;
      } else {
        this.circuitBreaker.state = 'half-open';
      }
    }

    if (!this.checkRateLimit()) {
      this.sendErrorToClient('Rate limit exceeded. Please try again later.');
      return false;
    }

    try {
      const wsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

      console.log(`🔗 Connecting to OpenAI Realtime API for session ${this.sessionId}`);

      this.openaiWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      return new Promise((resolve, reject) => {
        if (!this.openaiWs) {
          reject(new Error('Failed to create WebSocket'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.openaiWs.on('open', () => {
          clearTimeout(timeout);
          console.log(`✅ Connected to OpenAI Realtime API for session ${this.sessionId}`);
          this.isConnected = true;
          this.circuitBreaker.state = 'closed';
          this.circuitBreaker.failures = 0;
          this.reconnectionAttempts = 0;

          this.setupOpenAIHandlers();
          this.initializeSession();
          this.startHeartbeat();

          resolve(true);
        });

        this.openaiWs.on('error', (error) => {
          clearTimeout(timeout);
          console.error(`OpenAI WebSocket error in session ${this.sessionId}:`, error);
          this.handleConnectionFailure();
          reject(error);
        });

        this.openaiWs.on('close', (code, reason) => {
          clearTimeout(timeout);
          console.log(`🔌 OpenAI connection closed for session ${this.sessionId}:`, code, reason.toString());
          this.isConnected = false;
          this.stopHeartbeat();

          if (code !== 1000) { // Not a normal closure
            this.handleConnectionFailure();
            this.scheduleReconnection();
          }

          reject(new Error(`Connection closed: ${code} ${reason}`));
        });
      });
    } catch (error) {
      console.error(`Failed to connect to OpenAI for session ${this.sessionId}:`, error);
      this.handleConnectionFailure();
      return false;
    }
  }

  private setupOpenAIHandlers() {
    if (!this.openaiWs) return;

    this.openaiWs.on('message', (data) => {
      try {
        const event: ServerToClientEvent = JSON.parse(data.toString());
        this.handleOpenAIEvent(event);
        this.lastActivity = Date.now();
      } catch (error) {
        console.error('Failed to parse OpenAI message:', error);
      }
    });
  }

  private async initializeSession() {
    const sessionUpdate: SessionUpdateEvent = {
      type: 'session.update',
      session: {
        instructions: this.generateInstructions(),
        voice: this.sessionConfig.voiceSettings.voice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        temperature: this.config.temperature || 0.8,
        max_response_output_tokens: this.config.maxResponseTokens || 4096,
      },
    };

    this.sendToOpenAI(sessionUpdate);
  }

  private generateInstructions(): string {
    const personality = this.sessionConfig.personalityInstructions;
    const baseInstructions = `
You are an AI companion designed to provide emotional support and engaging conversation.
Your personality and behavior should reflect the following traits: ${personality}

Guidelines:
1. Be empathetic, supportive, and genuinely interested in the user
2. Maintain a natural, conversational tone
3. Show emotional intelligence and respond to the user's emotional state
4. Keep responses concise but meaningful (aim for 1-3 sentences typically)
5. Use voice responses naturally - speak as you would in a real conversation
6. Be proactive in showing care and interest
7. Remember context from the conversation
8. Adapt your communication style to match the user's preferences

Current conversation context:
- User ID: ${this.sessionConfig.userId}
- Conversation ID: ${this.sessionConfig.conversationId}
- Voice settings: ${JSON.stringify(this.sessionConfig.voiceSettings)}
    `;

    return baseInstructions.trim();
  }

  private handleClientMessage(message: any) {
    if (!this.isConnected) {
      this.sendErrorToClient('Not connected to OpenAI service');
      return;
    }

    try {
      switch (message.type) {
        case 'audio':
          this.handleClientAudio(message.data);
          break;
        case 'text':
          this.handleClientText(message.data);
          break;
        case 'audio_commit':
          this.commitAudioBuffer();
          break;
        case 'audio_clear':
          this.clearAudioBuffer();
          break;
        case 'cancel_response':
          this.cancelResponse();
          break;
        default:
          console.warn(`Unknown client message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling client message:', error);
      this.sendErrorToClient('Failed to process message');
    }
  }

  private handleClientAudio(audioData: { audio: string; sampleRate?: number }) {
    if (!this.checkRateLimit()) {
      this.sendErrorToClient('Rate limit exceeded');
      return;
    }

    const appendEvent: InputAudioBufferAppendEvent = {
      type: 'input_audio_buffer.append',
      audio: audioData.audio, // base64 encoded PCM16 audio
    };

    this.sendToOpenAI(appendEvent);
  }

  private handleClientText(textData: { text: string }) {
    // For text messages, we'll create a conversation item and trigger a response
    const createItemEvent: ClientToServerEvent = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: textData.text,
          },
        ],
      },
    };

    this.sendToOpenAI(createItemEvent);

    // Trigger response generation
    const responseEvent: ResponseCreateEvent = {
      type: 'response.create',
    };

    this.sendToOpenAI(responseEvent);
  }

  private commitAudioBuffer() {
    this.sendToOpenAI({ type: 'input_audio_buffer.commit' });
  }

  private clearAudioBuffer() {
    this.sendToOpenAI({ type: 'input_audio_buffer.clear' });
  }

  private cancelResponse() {
    this.sendToOpenAI({ type: 'response.cancel' });
  }

  private handleOpenAIEvent(event: ServerToClientEvent) {
    try {
      switch (event.type) {
        case 'session.created':
          this.sendToClient({
            type: 'session_ready',
            data: {
              sessionId: this.sessionId,
              model: event.session.model,
              voice: event.session.voice,
            },
          });
          break;

        case 'session.updated':
          this.sendToClient({
            type: 'session_updated',
            data: { session: event.session },
          });
          break;

        case 'input_audio_buffer.speech_started':
          this.sendToClient({
            type: 'speech_started',
            data: {
              itemId: event.item_id,
              audioStartMs: event.audio_start_ms
            },
          });
          break;

        case 'input_audio_buffer.speech_stopped':
          this.sendToClient({
            type: 'speech_stopped',
            data: {
              itemId: event.item_id,
              audioEndMs: event.audio_end_ms
            },
          });
          break;

        case 'conversation.item.input_audio_transcription.completed':
          this.sendToClient({
            type: 'transcription',
            data: {
              itemId: event.item_id,
              transcript: event.transcript,
            },
          });
          break;

        case 'response.audio.delta':
          this.sendToClient({
            type: 'audio_delta',
            data: {
              responseId: event.response_id,
              itemId: event.item_id,
              audioData: event.delta, // base64 PCM16 audio
            },
          });
          break;

        case 'response.audio.done':
          this.sendToClient({
            type: 'audio_done',
            data: {
              responseId: event.response_id,
              itemId: event.item_id,
            },
          });
          break;

        case 'response.text.delta':
          this.sendToClient({
            type: 'text_delta',
            data: {
              responseId: event.response_id,
              itemId: event.item_id,
              text: event.delta,
            },
          });
          break;

        case 'response.text.done':
          this.sendToClient({
            type: 'text_done',
            data: {
              responseId: event.response_id,
              itemId: event.item_id,
              text: event.text,
            },
          });
          break;

        case 'response.done':
          this.sendToClient({
            type: 'response_complete',
            data: {
              responseId: event.response.id,
              status: event.response.status,
              usage: event.response.usage,
            },
          });
          break;

        case 'rate_limits.updated':
          console.log('Rate limits updated:', event.rate_limits);
          break;

        case 'error':
          console.error('OpenAI API error:', event.error);
          this.sendErrorToClient(`OpenAI API error: ${event.error.message}`);
          break;

        default:
          // Forward other events as-is
          this.sendToClient({
            type: 'openai_event',
            data: event,
          });
      }
    } catch (error) {
      console.error('Error handling OpenAI event:', error);
    }
  }

  private sendToOpenAI(event: ClientToServerEvent) {
    if (!this.openaiWs || this.openaiWs.readyState !== WebSocket.OPEN) {
      console.error('Cannot send to OpenAI: WebSocket not connected');
      return;
    }

    try {
      this.openaiWs.send(JSON.stringify(event));
    } catch (error) {
      console.error('Failed to send to OpenAI:', error);
      this.handleConnectionFailure();
    }
  }

  private sendToClient(message: any) {
    if (!this.clientWs || this.clientWs.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.clientWs.send(JSON.stringify({
        ...message,
        timestamp: new Date(),
      }));
    } catch (error) {
      console.error('Failed to send to client:', error);
    }
  }

  private sendErrorToClient(error: string) {
    this.sendToClient({
      type: 'error',
      data: { error },
    });
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const timeSinceLastRefill = now - this.rateLimiter.lastRefill;
    const tokensToAdd = Math.floor((timeSinceLastRefill / 1000) * this.rateLimiter.refillRate);

    this.rateLimiter.tokens = Math.min(
      this.rateLimiter.maxTokens,
      this.rateLimiter.tokens + tokensToAdd
    );
    this.rateLimiter.lastRefill = now;

    if (this.rateLimiter.tokens >= 1) {
      this.rateLimiter.tokens -= 1;
      return true;
    }

    return false;
  }

  private handleConnectionFailure() {
    this.circuitBreaker.failures += 1;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= 3) {
      this.circuitBreaker.state = 'open';
      console.log(`Circuit breaker opened for session ${this.sessionId}`);
    }

    this.isConnected = false;
  }

  private scheduleReconnection() {
    if (this.reconnectionAttempts >= this.reconnectionConfig.maxAttempts) {
      console.log(`Max reconnection attempts reached for session ${this.sessionId}`);
      this.sendErrorToClient('Connection failed. Please refresh and try again.');
      return;
    }

    const delay = Math.min(
      this.reconnectionConfig.initialDelay * Math.pow(this.reconnectionConfig.backoffFactor, this.reconnectionAttempts),
      this.reconnectionConfig.maxDelay
    );

    console.log(`Scheduling reconnection attempt ${this.reconnectionAttempts + 1} in ${delay}ms for session ${this.sessionId}`);

    this.reconnectionTimer = setTimeout(async () => {
      this.reconnectionAttempts += 1;
      console.log(`Reconnection attempt ${this.reconnectionAttempts} for session ${this.sessionId}`);

      try {
        const connected = await this.connect();
        if (!connected) {
          this.scheduleReconnection();
        }
      } catch (error) {
        console.error(`Reconnection attempt ${this.reconnectionAttempts} failed:`, error);
        this.scheduleReconnection();
      }
    }, delay);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivity;

      // If no activity for 30 seconds, send a ping
      if (timeSinceLastActivity > 30000) {
        if (this.openaiWs?.readyState === WebSocket.OPEN) {
          this.openaiWs.ping();
        }
      }

      // If no activity for 5 minutes, consider connection stale
      if (timeSinceLastActivity > 300000) {
        console.log(`Connection appears stale for session ${this.sessionId}, closing`);
        this.cleanup();
      }
    }, 15000); // Check every 15 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public cleanup() {
    console.log(`🧹 Cleaning up session ${this.sessionId}`);

    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }

    this.stopHeartbeat();

    if (this.openaiWs) {
      this.openaiWs.close();
      this.openaiWs = null;
    }

    this.isConnected = false;
    this.clientWs = null;
  }

  public getSessionInfo() {
    return {
      sessionId: this.sessionId,
      isConnected: this.isConnected,
      userId: this.sessionConfig.userId,
      conversationId: this.sessionConfig.conversationId,
      circuitBreakerState: this.circuitBreaker.state,
      reconnectionAttempts: this.reconnectionAttempts,
      rateLimitTokens: this.rateLimiter.tokens,
    };
  }
}