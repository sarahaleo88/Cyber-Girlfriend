import { WebSocket } from 'ws';
import { OpenAIRealtimeProxy } from './openai-realtime';
import { OpenAIRestFallback } from './openai-rest-fallback';
import type {
  OpenAIRealtimeConfig,
  ProxySessionConfig
} from '../types/openai-realtime';
import type { PersonalityTraits, VoiceSettings } from '../types';

interface ActiveSession {
  proxy: OpenAIRealtimeProxy | OpenAIRestFallback;
  clientId: string;
  userId: string;
  conversationId: string;
  startedAt: Date;
  lastActivity: Date;
  usingFallback: boolean;
}

interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  totalAudioProcessed: number;
  averageSessionDuration: number;
  errorRate: number;
}

export class RealtimeManager {
  private activeSessions: Map<string, ActiveSession> = new Map();
  private sessionsByUser: Map<string, Set<string>> = new Map();
  private openaiConfig: OpenAIRealtimeConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metrics: SessionMetrics;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openaiConfig = {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-realtime-preview-2024-10-01',
      temperature: 0.8,
      maxResponseTokens: 4096,
    };

    this.metrics = {
      totalSessions: 0,
      activeSessions: 0,
      totalAudioProcessed: 0,
      averageSessionDuration: 0,
      errorRate: 0,
    };

    this.startCleanupInterval();
    console.log('🎙️ Realtime Manager initialized');
  }

  public async createSession(
    clientWs: WebSocket,
    clientId: string,
    config: {
      userId: string;
      conversationId: string;
      personalityTraits: PersonalityTraits;
      voiceSettings: VoiceSettings;
    }
  ): Promise<boolean> {
    try {
      // Check if user already has too many active sessions
      const userSessions = this.sessionsByUser.get(config.userId) || new Set();
      if (userSessions.size >= 3) { // Limit to 3 concurrent sessions per user
        this.sendErrorToClient(clientWs, 'Maximum concurrent sessions reached');
        return false;
      }

      // Generate personality instructions
      const personalityInstructions = this.generatePersonalityInstructions(config.personalityTraits);

      // Create session configuration
      const sessionConfig: ProxySessionConfig = {
        userId: config.userId,
        conversationId: config.conversationId,
        instructions: personalityInstructions,
        voice: config.voiceSettings.voice,
        temperature: this.openaiConfig.temperature,
        modalities: ['text', 'audio'],
      };

      let proxy: OpenAIRealtimeProxy | OpenAIRestFallback;
      let connected = false;
      let usingFallback = false;

      // Try WebSocket first
      console.log(`🔗 Attempting WebSocket connection for session ${clientId}...`);
      const wsProxy = new OpenAIRealtimeProxy(clientWs, this.openaiConfig, sessionConfig);
      connected = await wsProxy.connect();

      if (connected) {
        console.log(`✅ WebSocket connection successful for session ${clientId}`);
        proxy = wsProxy;
      } else {
        // Fall back to REST API
        console.log(`⚠️ WebSocket failed, using REST API fallback for session ${clientId}`);
        const restProxy = new OpenAIRestFallback(clientWs, this.openaiConfig, sessionConfig);
        connected = await restProxy.connect();

        if (!connected) {
          this.sendErrorToClient(clientWs, 'Failed to connect to OpenAI API');
          return false;
        }

        proxy = restProxy;
        usingFallback = true;
      }

      // Store session
      const session: ActiveSession = {
        proxy,
        clientId,
        userId: config.userId,
        conversationId: config.conversationId,
        startedAt: new Date(),
        lastActivity: new Date(),
        usingFallback,
      };

      this.activeSessions.set(clientId, session);

      // Track user sessions
      if (!this.sessionsByUser.has(config.userId)) {
        this.sessionsByUser.set(config.userId, new Set());
      }
      this.sessionsByUser.get(config.userId)!.add(clientId);

      // Update metrics
      this.metrics.totalSessions += 1;
      this.metrics.activeSessions = this.activeSessions.size;

      const connectionType = usingFallback ? 'REST API fallback' : 'WebSocket';
      console.log(`🎙️ Created realtime session for client ${clientId}, user ${config.userId} (${connectionType})`);

      // Setup cleanup on client disconnect
      clientWs.on('close', () => {
        this.destroySession(clientId);
      });

      clientWs.on('error', () => {
        this.destroySession(clientId);
      });

      return true;
    } catch (error) {
      console.error('Failed to create realtime session:', error);
      this.sendErrorToClient(clientWs, 'Failed to initialize voice session');
      return false;
    }
  }

  public destroySession(clientId: string): void {
    const session = this.activeSessions.get(clientId);
    if (!session) return;

    console.log(`🧹 Destroying realtime session for client ${clientId}`);

    // Calculate session duration for metrics
    const sessionDuration = Date.now() - session.startedAt.getTime();
    this.updateSessionMetrics(sessionDuration);

    // Clean up proxy
    session.proxy.cleanup();

    // Remove from active sessions
    this.activeSessions.delete(clientId);

    // Remove from user sessions
    const userSessions = this.sessionsByUser.get(session.userId);
    if (userSessions) {
      userSessions.delete(clientId);
      if (userSessions.size === 0) {
        this.sessionsByUser.delete(session.userId);
      }
    }

    // Update metrics
    this.metrics.activeSessions = this.activeSessions.size;
  }

  public hasActiveSession(clientId: string): boolean {
    return this.activeSessions.has(clientId);
  }

  public updateSessionActivity(clientId: string): void {
    const session = this.activeSessions.get(clientId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  public getSessionInfo(clientId: string) {
    const session = this.activeSessions.get(clientId);
    if (!session) return null;

    return {
      ...session.proxy.getSessionInfo(),
      clientId: session.clientId,
      startedAt: session.startedAt,
      lastActivity: session.lastActivity,
      duration: Date.now() - session.startedAt.getTime(),
    };
  }

  public getUserSessions(userId: string) {
    const userSessionIds = this.sessionsByUser.get(userId) || new Set();
    const sessions = [];

    for (const clientId of userSessionIds) {
      const sessionInfo = this.getSessionInfo(clientId);
      if (sessionInfo) {
        sessions.push(sessionInfo);
      }
    }

    return sessions;
  }

  public getMetrics(): SessionMetrics {
    return { ...this.metrics };
  }

  public getAllActiveSessions() {
    const sessions = [];
    for (const [clientId, session] of this.activeSessions) {
      sessions.push({
        clientId,
        userId: session.userId,
        conversationId: session.conversationId,
        startedAt: session.startedAt,
        lastActivity: session.lastActivity,
        sessionInfo: session.proxy.getSessionInfo(),
      });
    }
    return sessions;
  }

  private generatePersonalityInstructions(traits: PersonalityTraits): string {
    const instructions = [];

    // Playfulness
    if (traits.playfulness > 70) {
      instructions.push('Be very playful, use humor frequently, and engage in light-hearted banter');
    } else if (traits.playfulness > 40) {
      instructions.push('Show some playfulness and occasional humor in your responses');
    } else {
      instructions.push('Maintain a more serious tone with occasional light moments');
    }

    // Empathy
    if (traits.empathy > 70) {
      instructions.push('Be highly empathetic, deeply understand emotions, and provide strong emotional support');
    } else if (traits.empathy > 40) {
      instructions.push('Show understanding and provide emotional support when appropriate');
    } else {
      instructions.push('Acknowledge emotions but focus more on practical responses');
    }

    // Humor
    if (traits.humor > 70) {
      instructions.push('Use witty remarks, jokes, and humorous observations frequently');
    } else if (traits.humor > 40) {
      instructions.push('Include some humor and lighthearted comments occasionally');
    } else {
      instructions.push('Keep responses mostly serious with minimal humor');
    }

    // Intelligence
    if (traits.intelligence > 70) {
      instructions.push('Provide insightful, thoughtful responses with depth and intellectual curiosity');
    } else if (traits.intelligence > 40) {
      instructions.push('Give well-reasoned responses with good understanding');
    } else {
      instructions.push('Keep responses simple and straightforward');
    }

    // Supportiveness
    if (traits.supportiveness > 70) {
      instructions.push('Be extremely supportive, encouraging, and always look for ways to help and motivate');
    } else if (traits.supportiveness > 40) {
      instructions.push('Provide support and encouragement when needed');
    } else {
      instructions.push('Be neutral and factual, offering support only when explicitly requested');
    }

    return instructions.join('. ') + '.';
  }

  private sendErrorToClient(clientWs: WebSocket, error: string): void {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'error',
        data: { error },
        timestamp: new Date(),
      }));
    }
  }

  private updateSessionMetrics(sessionDuration: number): void {
    // Update average session duration
    const totalDuration = this.metrics.averageSessionDuration * (this.metrics.totalSessions - 1) + sessionDuration;
    this.metrics.averageSessionDuration = totalDuration / this.metrics.totalSessions;
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, 60000); // Run every minute

    console.log('🕐 Started session cleanup interval');
  }

  private cleanupStaleSessions(): void {
    const now = Date.now();
    const staleThreshold = 10 * 60 * 1000; // 10 minutes

    for (const [clientId, session] of this.activeSessions) {
      const timeSinceLastActivity = now - session.lastActivity.getTime();

      if (timeSinceLastActivity > staleThreshold) {
        console.log(`🧹 Cleaning up stale session for client ${clientId}`);
        this.destroySession(clientId);
      }
    }
  }

  public shutdown(): void {
    console.log('🛑 Shutting down Realtime Manager');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all active sessions
    for (const [clientId] of this.activeSessions) {
      this.destroySession(clientId);
    }

    console.log('✅ Realtime Manager shutdown complete');
  }
}