import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  AppState,
  AppActions,
  User,
  Conversation,
  Message,
  EmotionType,
  UserPreferences,
  AudioDevice
} from '../types';

interface AppStore extends AppState, AppActions {}

const createConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: `Conversation ${new Date().toLocaleDateString()}`,
  messages: [],
  startedAt: new Date(),
  lastActivityAt: new Date(),
});

const createMessage = (content: string, sender: 'user' | 'ai' | 'system', type: 'text' | 'audio' = 'text'): Message => ({
  id: crypto.randomUUID(),
  content,
  sender,
  type,
  timestamp: new Date(),
  status: sender === 'user' ? 'sent' : 'received',
  emotion: sender === 'ai' ? 'friendly' as EmotionType : undefined,
});

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        currentConversation: null,
        conversations: [],
        isConnected: false,
        isRecording: false,
        isPlaying: false,
        currentEmotion: 'calm',
        audioPermissionGranted: false,
        audioInitialized: false,
        microphoneLevel: 0,
        speechDetected: false,
        availableAudioDevices: [],

        // Actions
        setUser: (user: User) => set({ user }, false, 'setUser'),

        startConversation: () => {
          const newConversation = createConversation();
          set(
            (state) => ({
              currentConversation: newConversation,
              conversations: [newConversation, ...state.conversations],
            }),
            false,
            'startConversation'
          );
        },

        endConversation: () => {
          set({ currentConversation: null }, false, 'endConversation');
        },

        addMessage: (messageData) => {
          const message = createMessage(messageData.content, messageData.sender, messageData.type);
          if (messageData.audioUrl) {
            message.audioUrl = messageData.audioUrl;
          }
          if (messageData.emotion) {
            message.emotion = messageData.emotion;
          }
          if (messageData.status) {
            message.status = messageData.status;
          }

          set(
            (state) => {
              if (!state.currentConversation) return state;

              const updatedConversation = {
                ...state.currentConversation,
                messages: [...state.currentConversation.messages, message],
                lastActivityAt: new Date(),
              };

              return {
                currentConversation: updatedConversation,
                conversations: state.conversations.map((conv) =>
                  conv.id === updatedConversation.id ? updatedConversation : conv
                ),
              };
            },
            false,
            'addMessage'
          );
        },

        setConnected: (connected: boolean) => set({ isConnected: connected }, false, 'setConnected'),

        setRecording: (recording: boolean) => set({ isRecording: recording }, false, 'setRecording'),

        setPlaying: (playing: boolean) => set({ isPlaying: playing }, false, 'setPlaying'),

        setEmotion: (emotion: EmotionType) => set({ currentEmotion: emotion }, false, 'setEmotion'),

        updateUserPreferences: (preferences: Partial<UserPreferences>) => {
          set(
            (state) => {
              if (!state.user) return state;
              return {
                user: {
                  ...state.user,
                  preferences: {
                    ...state.user.preferences,
                    ...preferences,
                  },
                },
              };
            },
            false,
            'updateUserPreferences'
          );
        },

        // Audio actions
        setAudioPermissionGranted: (granted: boolean) =>
          set({ audioPermissionGranted: granted }, false, 'setAudioPermissionGranted'),

        setAudioInitialized: (initialized: boolean) =>
          set({ audioInitialized: initialized }, false, 'setAudioInitialized'),

        setMicrophoneLevel: (level: number) =>
          set({ microphoneLevel: level }, false, 'setMicrophoneLevel'),

        setSpeechDetected: (detected: boolean) =>
          set({ speechDetected: detected }, false, 'setSpeechDetected'),

        setAvailableAudioDevices: (devices: AudioDevice[]) =>
          set({ availableAudioDevices: devices }, false, 'setAvailableAudioDevices'),
      }),
      {
        name: 'cyber-girlfriend-store',
        partialize: (state) => ({
          user: state.user,
          conversations: state.conversations,
          audioPermissionGranted: state.audioPermissionGranted,
          availableAudioDevices: state.availableAudioDevices,
        }),
      }
    ),
    {
      name: 'CyberGirlfriendStore',
    }
  )
);

// Selectors for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useCurrentConversation = () => useAppStore((state) => state.currentConversation);
export const useConversations = () => useAppStore((state) => state.conversations);
export const useConnectionStatus = () => useAppStore((state) => state.isConnected);
export const useRecordingStatus = () => useAppStore((state) => state.isRecording);
export const usePlayingStatus = () => useAppStore((state) => state.isPlaying);
export const useCurrentEmotion = () => useAppStore((state) => state.currentEmotion);

// Audio selectors
export const useAudioPermissionGranted = () => useAppStore((state) => state.audioPermissionGranted);
export const useAudioInitialized = () => useAppStore((state) => state.audioInitialized);
export const useMicrophoneLevel = () => useAppStore((state) => state.microphoneLevel);
export const useSpeechDetected = () => useAppStore((state) => state.speechDetected);
export const useAvailableAudioDevices = () => useAppStore((state) => state.availableAudioDevices);

// Audio actions selectors
export const useAudioActions = () => useAppStore((state) => ({
  setAudioPermissionGranted: state.setAudioPermissionGranted,
  setAudioInitialized: state.setAudioInitialized,
  setMicrophoneLevel: state.setMicrophoneLevel,
  setSpeechDetected: state.setSpeechDetected,
  setAvailableAudioDevices: state.setAvailableAudioDevices,
  setRecording: state.setRecording,
  setPlaying: state.setPlaying,
}));