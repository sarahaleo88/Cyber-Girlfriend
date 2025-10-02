import { useEffect, useCallback, useRef } from 'react';
import { audioManager, AudioVisualizationData, AudioDevice } from '../services/audioManager';
import {
  useAudioActions,
  useAudioPermissionGranted,
  useAudioInitialized,
  useRecordingStatus,
  usePlayingStatus,
  useUser
} from '../store/appStore';

export interface UseAudioReturn {
  // State
  isPermissionGranted: boolean;
  isInitialized: boolean;
  isRecording: boolean;
  isPlaying: boolean;

  // Actions
  requestPermission: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  playAudio: (audioData: string) => Promise<void>;
  getDevices: () => Promise<AudioDevice[]>;
  selectMicrophone: (deviceId: string) => Promise<void>;
  setMicrophoneGain: (gain: number) => void;
  setVADThreshold: (threshold: number) => void;

  // Status
  status: any;

  // Error handling
  error: Error | null;
}

export const useAudio = (): UseAudioReturn => {
  const isPermissionGranted = useAudioPermissionGranted();
  const isInitialized = useAudioInitialized();
  const isRecording = useRecordingStatus();
  const isPlaying = usePlayingStatus();
  const user = useUser();

  const audioActions = useAudioActions();
  const errorRef = useRef<Error | null>(null);
  const visualizationCallbackRef = useRef<((data: AudioVisualizationData) => void) | null>(null);

  // Initialize audio manager and set up callbacks
  useEffect(() => {
    const initializeAudioManager = async () => {
      try {
        // Set up error callback
        audioManager.setErrorCallback((error: Error) => {
          console.error('AudioManager Error:', error);
          errorRef.current = error;
        });

        // Set up visualization callback
        audioManager.setVisualizationCallback((data: AudioVisualizationData) => {
          // Update microphone level in store
          audioActions.setMicrophoneLevel(data.rmsLevel);

          // Update speech detection status
          audioActions.setSpeechDetected(data.isSpeechDetected);

          // Call external visualization callback if set
          if (visualizationCallbackRef.current) {
            visualizationCallbackRef.current(data);
          }
        });

        // Set up recording callback for WebSocket transmission
        audioManager.setRecordingCallback((audioData: ArrayBuffer) => {
          // This will be connected to WebSocket service later
          // For now, we can log or process the audio data
          console.log('Audio data received:', audioData.byteLength, 'bytes');
        });

        // Load audio devices
        try {
          const devices = await audioManager.getAudioDevices();
          audioActions.setAvailableAudioDevices(devices);
        } catch (error) {
          console.warn('Could not load audio devices:', error);
        }

        audioActions.setAudioInitialized(true);

      } catch (error) {
        console.error('Failed to initialize audio manager:', error);
        errorRef.current = error as Error;
      }
    };

    initializeAudioManager();

    // Cleanup on unmount
    return () => {
      audioManager.dispose();
    };
  }, [audioActions]);

  // Apply user voice settings when user changes
  useEffect(() => {
    if (user?.preferences?.voiceSettings && isInitialized) {
      const { microphoneGain = 1.0, vadThreshold = -40 } = user.preferences.voiceSettings;

      audioManager.setMicrophoneGain(microphoneGain);
      audioManager.setVADThreshold(vadThreshold);
    }
  }, [user, isInitialized]);

  const requestPermission = useCallback(async () => {
    try {
      errorRef.current = null;
      await audioManager.requestMicrophoneAccess();
      audioActions.setAudioPermissionGranted(true);

      // Update devices list after permission granted
      const devices = await audioManager.getAudioDevices();
      audioActions.setAvailableAudioDevices(devices);

    } catch (error) {
      console.error('Permission request failed:', error);
      audioActions.setAudioPermissionGranted(false);
      errorRef.current = error as Error;
      throw error;
    }
  }, [audioActions]);

  const startRecording = useCallback(async () => {
    try {
      errorRef.current = null;

      if (!isPermissionGranted) {
        await requestPermission();
      }

      await audioManager.startRecording();
      audioActions.setRecording(true);

    } catch (error) {
      console.error('Start recording failed:', error);
      audioActions.setRecording(false);
      errorRef.current = error as Error;
      throw error;
    }
  }, [isPermissionGranted, requestPermission, audioActions]);

  const stopRecording = useCallback(() => {
    try {
      audioManager.stopRecording();
      audioActions.setRecording(false);
    } catch (error) {
      console.error('Stop recording failed:', error);
      errorRef.current = error as Error;
    }
  }, [audioActions]);

  const playAudio = useCallback(async (audioData: string) => {
    try {
      errorRef.current = null;
      audioActions.setPlaying(true);
      await audioManager.playAudioResponse(audioData);
    } catch (error) {
      console.error('Audio playback failed:', error);
      audioActions.setPlaying(false);
      errorRef.current = error as Error;
      throw error;
    }
  }, [audioActions]);

  const getDevices = useCallback(async () => {
    try {
      const devices = await audioManager.getAudioDevices();
      audioActions.setAvailableAudioDevices(devices);
      return devices;
    } catch (error) {
      console.error('Get devices failed:', error);
      errorRef.current = error as Error;
      throw error;
    }
  }, [audioActions]);

  const selectMicrophone = useCallback(async (deviceId: string) => {
    try {
      errorRef.current = null;

      // Re-request microphone access with specific device
      await audioManager.requestMicrophoneAccess(deviceId);

      // Update user preferences if we have a user
      if (user) {
        // This would typically call updateUserPreferences action
        // For now, we'll just log the selection
        console.log('Selected microphone:', deviceId);
      }

    } catch (error) {
      console.error('Microphone selection failed:', error);
      errorRef.current = error as Error;
      throw error;
    }
  }, [user]);

  const setMicrophoneGain = useCallback((gain: number) => {
    audioManager.setMicrophoneGain(gain);

    // Update user preferences if we have a user
    if (user) {
      // This would typically call updateUserPreferences action
      console.log('Set microphone gain:', gain);
    }
  }, [user]);

  const setVADThreshold = useCallback((threshold: number) => {
    audioManager.setVADThreshold(threshold);

    // Update user preferences if we have a user
    if (user) {
      // This would typically call updateUserPreferences action
      console.log('Set VAD threshold:', threshold);
    }
  }, [user]);

  const status = audioManager.getStatus();

  return {
    // State
    isPermissionGranted,
    isInitialized,
    isRecording,
    isPlaying,

    // Actions
    requestPermission,
    startRecording,
    stopRecording,
    playAudio,
    getDevices,
    selectMicrophone,
    setMicrophoneGain,
    setVADThreshold,

    // Status
    status,

    // Error handling
    error: errorRef.current,
  };
};

// Hook for visualization callbacks
export const useAudioVisualization = (callback: (data: AudioVisualizationData) => void) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const visualizationCallback = (data: AudioVisualizationData) => {
      callbackRef.current(data);
    };

    // Set the callback in the audio manager
    // Note: This is a simplified approach. In a real implementation,
    // you might want to manage multiple visualization callbacks
    audioManager.setVisualizationCallback(visualizationCallback);

    return () => {
      // Clear the callback
      audioManager.setVisualizationCallback(() => {});
    };
  }, []);
};