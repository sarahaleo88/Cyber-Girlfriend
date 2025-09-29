// Core types for the cyber-girlfriend application

export interface User {
  id: string;
  name: string;
  avatar?: string;
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
  microphoneGain: number; // 0.0 - 2.0
  vadThreshold: number; // -60 to 0 dB
  selectedMicrophone?: string; // device ID
  selectedSpeaker?: string; // device ID
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
  content: string;
  timestamp: Date;
  sender: 'user' | 'ai';
  type: 'text' | 'audio';
  audioUrl?: string;
  emotion?: EmotionType;
}

export type EmotionType = 'happy' | 'sad' | 'excited' | 'calm' | 'thoughtful' | 'playful';

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  startedAt: Date;
  lastActivityAt: Date;
}

export interface AppState {
  user: User | null;
  currentConversation: Conversation | null;
  conversations: Conversation[];
  isConnected: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  currentEmotion: EmotionType;
  audioPermissionGranted: boolean;
  audioInitialized: boolean;
  microphoneLevel: number;
  speechDetected: boolean;
  availableAudioDevices: AudioDevice[];
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface AudioVisualizationData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  rmsLevel: number;
  isSpeechDetected: boolean;
}

export interface AppActions {
  setUser: (user: User) => void;
  startConversation: () => void;
  endConversation: () => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setConnected: (connected: boolean) => void;
  setRecording: (recording: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setEmotion: (emotion: EmotionType) => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  setAudioPermissionGranted: (granted: boolean) => void;
  setAudioInitialized: (initialized: boolean) => void;
  setMicrophoneLevel: (level: number) => void;
  setSpeechDetected: (detected: boolean) => void;
  setAvailableAudioDevices: (devices: AudioDevice[]) => void;
}