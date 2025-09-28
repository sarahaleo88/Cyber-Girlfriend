// Backend types for the cyber-girlfriend application

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  voiceSettings: VoiceSettings;
  personalityTraits: PersonalityTraits;
  conversationStyle: ConversationStyle;
}

export interface VoiceSettings {
  pitch: number; // 0.5 - 2.0
  speed: number; // 0.5 - 2.0
  voice: VoiceType;
  volume: number; // 0.0 - 1.0
}

export interface PersonalityTraits {
  playfulness: number; // 0-100
  empathy: number; // 0-100
  humor: number; // 0-100
  intelligence: number; // 0-100
  supportiveness: number; // 0-100
}

export interface ConversationStyle {
  formality: 'casual' | 'friendly' | 'formal';
  topics: string[];
  responseLength: 'short' | 'medium' | 'long';
}

export type VoiceType = 'alloy' | 'echo' | 'fable' | 'nova' | 'shimmer';

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'ai';
  type: 'text' | 'audio';
  audioUrl?: string;
  emotion?: EmotionType;
  metadata?: Record<string, any>;
}

export type EmotionType = 'happy' | 'sad' | 'excited' | 'calm' | 'thoughtful' | 'playful';

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  startedAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface VoiceRequest {
  text: string;
  voiceSettings: VoiceSettings;
  emotion?: EmotionType;
}

export interface VoiceResponse {
  audioUrl: string;
  duration: number;
  emotion: EmotionType;
}

export interface WebSocketMessage {
  type: 'audio' | 'text' | 'emotion' | 'status';
  data: any;
  timestamp: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}