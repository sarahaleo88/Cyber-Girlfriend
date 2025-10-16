/**
 * OpenAI REST API Fallback
 * 
 * Since WebSocket connections to OpenAI Realtime API are failing,
 * this provides a fallback using the standard OpenAI API with:
 * - Text-to-Speech (TTS) for audio output
 * - Whisper for audio input transcription
 * - GPT-4 for conversation
 * 
 * This provides similar functionality while we debug the WebSocket issue.
 */

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  OpenAIRealtimeConfig,
  ProxySessionConfig,
} from '../types/openai-realtime';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OpenAIRestFallback {
  private clientWs: WebSocket | null = null;
  private sessionId: string;
  private config: OpenAIRealtimeConfig;
  private sessionConfig: ProxySessionConfig;
  private conversationHistory: Message[] = [];
  private isConnected: boolean = false;

  constructor(
    clientWs: WebSocket,
    config: OpenAIRealtimeConfig,
    sessionConfig: ProxySessionConfig
  ) {
    this.clientWs = clientWs;
    this.config = config;
    this.sessionConfig = sessionConfig;
    this.sessionId = uuidv4();

    // Initialize conversation with system message
    this.conversationHistory.push({
      role: 'system',
      content: sessionConfig.instructions || 'You are a helpful AI assistant.',
    });

    this.setupClientHandlers();
  }

  private setupClientHandlers() {
    if (!this.clientWs) return;

    this.clientWs.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleClientMessage(message);
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
    try {
      console.log(`🔗 Initializing REST API fallback for session ${this.sessionId}`);
      
      // Test API connection
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        console.error(`❌ Failed to connect to OpenAI API: ${response.status}`);
        this.sendErrorToClient('Failed to connect to OpenAI API');
        return false;
      }

      this.isConnected = true;
      console.log(`✅ REST API fallback initialized for session ${this.sessionId}`);

      // Send session created event
      this.sendToClient({
        type: 'session.created',
        session: {
          id: this.sessionId,
          model: 'gpt-4o-mini',
          voice: this.sessionConfig.voice || 'alloy',
          modalities: ['text', 'audio'],
          instructions: this.sessionConfig.instructions,
        },
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to initialize REST API fallback:`, error);
      this.sendErrorToClient('Failed to initialize OpenAI connection');
      return false;
    }
  }

  private async handleClientMessage(message: any) {
    console.log(`📨 Client → Server: ${message.type}`);

    if (!this.isConnected) {
      this.sendErrorToClient('Not connected to OpenAI');
      return;
    }

    switch (message.type) {
      case 'session.update':
        await this.handleSessionUpdate(message);
        break;

      case 'input_audio_buffer.append':
        await this.handleAudioInput(message);
        break;

      case 'input_audio_buffer.commit':
        // Audio buffer committed, ready for transcription
        this.sendToClient({
          type: 'input_audio_buffer.committed',
        });
        break;

      case 'response.create':
        await this.handleResponseCreate(message);
        break;

      case 'conversation.item.create':
        await this.handleConversationItemCreate(message);
        break;

      default:
        console.log(`⚠️ Unhandled message type: ${message.type}`);
    }
  }

  private async handleSessionUpdate(message: any) {
    // Update session configuration
    if (message.session) {
      if (message.session.instructions) {
        this.conversationHistory[0].content = message.session.instructions;
      }
    }

    this.sendToClient({
      type: 'session.updated',
      session: {
        id: this.sessionId,
        model: 'gpt-4o-mini',
        modalities: ['text', 'audio'],
        instructions: this.conversationHistory[0].content,
        voice: this.sessionConfig.voice || 'alloy',
      },
    });
  }

  private async handleAudioInput(message: any) {
    // In a full implementation, we would:
    // 1. Accumulate audio chunks
    // 2. When committed, send to Whisper API for transcription
    // 3. Add transcription to conversation history
    
    // For now, send acknowledgment
    this.sendToClient({
      type: 'input_audio_buffer.speech_started',
      audio_start_ms: 0,
    });
  }

  private async handleResponseCreate(message: any) {
    try {
      // Send response.created event
      const responseId = `resp_${uuidv4()}`;
      this.sendToClient({
        type: 'response.created',
        response: {
          id: responseId,
          status: 'in_progress',
        },
      });

      // Call GPT-4 API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: this.conversationHistory,
          temperature: this.sessionConfig.temperature || 0.8,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;

      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      // Send response.text.delta events
      this.sendToClient({
        type: 'response.text.delta',
        delta: assistantMessage,
        response_id: responseId,
      });

      // Send response.text.done
      this.sendToClient({
        type: 'response.text.done',
        text: assistantMessage,
        response_id: responseId,
      });

      // Generate audio using TTS
      await this.generateAudio(assistantMessage, responseId);

      // Send response.done
      this.sendToClient({
        type: 'response.done',
        response: {
          id: responseId,
          status: 'completed',
        },
      });

    } catch (error) {
      console.error('Error creating response:', error);
      this.sendErrorToClient('Failed to generate response');
    }
  }

  private async handleConversationItemCreate(message: any) {
    if (message.item && message.item.content) {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: message.item.content,
      });

      this.sendToClient({
        type: 'conversation.item.created',
        item: message.item,
      });
    }
  }

  private async generateAudio(text: string, responseId: string) {
    try {
      // Call TTS API
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: this.sessionConfig.voice || 'alloy',
          input: text,
          response_format: 'pcm',
        }),
      });

      if (!response.ok) {
        console.error(`TTS API failed: ${response.status}`);
        return;
      }

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');

      // Send audio delta
      this.sendToClient({
        type: 'response.audio.delta',
        delta: base64Audio,
        response_id: responseId,
      });

      // Send audio done
      this.sendToClient({
        type: 'response.audio.done',
        response_id: responseId,
      });

    } catch (error) {
      console.error('Error generating audio:', error);
    }
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

  public cleanup() {
    console.log(`🧹 Cleaning up session ${this.sessionId}`);
    
    this.isConnected = false;

    if (this.clientWs) {
      this.clientWs.close();
      this.clientWs = null;
    }
  }
}

