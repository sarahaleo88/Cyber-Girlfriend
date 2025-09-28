import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  AppState,
  AppActions,
  User,
  Conversation,
  Message,
  EmotionType,
  UserPreferences
} from '../types';

interface AppStore extends AppState, AppActions {}

const createConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: `Conversation ${new Date().toLocaleDateString()}`,
  messages: [],
  startedAt: new Date(),
  lastActivityAt: new Date(),
});

const createMessage = (content: string, sender: 'user' | 'ai', type: 'text' | 'audio' = 'text'): Message => ({
  id: crypto.randomUUID(),
  content,
  sender,
  type,
  timestamp: new Date(),
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
      }),
      {
        name: 'cyber-girlfriend-store',
        partialize: (state) => ({
          user: state.user,
          conversations: state.conversations,
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