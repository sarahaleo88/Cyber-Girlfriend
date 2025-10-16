import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useRecordingStatus,
  usePlayingStatus,
  useConversationState,
  useAudioPermissionGranted,
  useAudioInitialized,
  useSpeechDetected,
  useAudioActions
} from '../store/appStore';
import { useAudio } from '../hooks/useAudio';
import VoiceVisualizer from './VoiceVisualizer';
import AudioSettings from './AudioSettings';

interface VoiceButtonProps {
  onAudioData?: (audioData: ArrayBuffer) => void;
  onTranscriptReceived?: (transcript: string) => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const VoiceButton: React.FC<VoiceButtonProps> = ({
  onAudioData,
  onTranscriptReceived,
  className = '',
  size = 'medium'
}) => {
  const isRecording = useRecordingStatus();
  const isPlaying = usePlayingStatus();
  const conversationState = useConversationState();
  const isPermissionGranted = useAudioPermissionGranted();
  const isInitialized = useAudioInitialized();
  const speechDetected = useSpeechDetected();
  const { setConversationState } = useAudioActions();

  const [showSettings, setShowSettings] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const {
    requestPermission,
    startRecording,
    stopRecording,
    error
  } = useAudio();

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  };

  const iconSizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  // Single click toggle handler for conversation states
  const handleToggleConversation = useCallback(async () => {
    try {
      switch (conversationState) {
        case 'idle':
          // Start conversation flow
          setConversationState('connecting');

          // Request permissions if needed
          if (!isPermissionGranted) {
            await requestPermission();
          }

          // Move to active state once connected
          setConversationState('active');
          await startRecording();
          break;

        case 'connecting':
          // Cancel connection attempt
          setConversationState('idle');
          break;

        case 'active':
          // Stop recording and end conversation
          await stopRecording();
          setConversationState('idle');
          break;

        case 'thinking':
          // Allow manual interruption during AI thinking
          setConversationState('idle');
          break;

        default:
          setConversationState('idle');
      }
    } catch (err) {
      console.error('Failed to toggle conversation:', err);
      setConversationState('idle');
    }
  }, [conversationState, setConversationState, isPermissionGranted, requestPermission, startRecording, stopRecording]);

  // Handle right-click or long press for settings
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (conversationState === 'idle') {
      setShowSettings(true);
    }
  }, [conversationState]);

  // Get button state for styling based on conversation state
  const getButtonState = () => {
    // Handle error states first
    if (!isInitialized) return 'initializing';
    if (!isPermissionGranted && conversationState !== 'idle') return 'permission-needed';

    // Use conversation state as primary state
    switch (conversationState) {
      case 'idle':
        return 'idle';
      case 'connecting':
        return 'connecting';
      case 'active':
        return isRecording ? 'recording' : 'active';
      case 'thinking':
        return 'thinking';
      default:
        return 'idle';
    }
  };

  const getButtonColor = () => {
    const state = getButtonState();
    switch (state) {
      case 'idle':
        return 'bg-gray-500 hover:bg-gray-600 shadow-gray-500/50';
      case 'connecting':
        return 'bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/50';
      case 'recording':
        return speechDetected
          ? 'bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 shadow-cyan-500/50'
          : 'bg-gradient-to-r from-cyan-400 to-pink-400 hover:from-cyan-500 hover:to-pink-500 shadow-cyan-400/50';
      case 'active':
        return 'bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 shadow-cyan-500/50';
      case 'thinking':
        return 'bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 shadow-pink-500/50';
      case 'permission-needed':
        return 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/50';
      case 'initializing':
        return 'bg-gray-400 shadow-gray-400/50';
      default:
        return 'bg-gray-500 hover:bg-gray-600 shadow-gray-500/50';
    }
  };

  const getButtonIcon = () => {
    const state = getButtonState();
    switch (state) {
      case 'idle':
        return (
          <svg className={`${iconSizeClasses[size]} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        );
      case 'connecting':
        return (
          <motion.svg
            className={`${iconSizeClasses[size]} text-white`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </motion.svg>
        );
      case 'recording':
        return (
          <motion.div
            className={`${iconSizeClasses[size]} bg-white rounded-full`}
            animate={{
              scale: speechDetected ? [1, 1.2, 1] : 1,
            }}
            transition={{
              duration: 0.5,
              repeat: speechDetected ? Infinity : 0,
            }}
          />
        );
      case 'active':
        return (
          <motion.svg
            className={`${iconSizeClasses[size]} text-white`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </motion.svg>
        );
      case 'thinking':
        return (
          <motion.div
            className="relative flex items-center justify-center"
          >
            <motion.div
              className={`${iconSizeClasses[size]} bg-white rounded-full opacity-20`}
              animate={{
                scale: [1, 2, 1],
                opacity: [0.2, 0.1, 0.2],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut'
              }}
            />
            <motion.div
              className={`absolute ${iconSizeClasses[size]} bg-white rounded-full`}
              animate={{
                scale: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </motion.div>
        );
      case 'permission-needed':
        return (
          <svg className={`${iconSizeClasses[size]} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'initializing':
        return (
          <motion.svg
            className={`${iconSizeClasses[size]} text-white`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </motion.svg>
        );
      default:
        return (
          <svg className={`${iconSizeClasses[size]} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        );
    }
  };

  const getTooltipText = () => {
    const state = getButtonState();
    switch (state) {
      case 'idle':
        return 'Click to start conversation';
      case 'connecting':
        return 'Connecting... Click to cancel';
      case 'recording':
        return 'Recording... Click to stop';
      case 'active':
        return 'Active conversation - Click to end';
      case 'thinking':
        return 'AI thinking... Click to interrupt';
      case 'permission-needed':
        return 'Click to grant microphone permission';
      case 'initializing':
        return 'Initializing audio system...';
      default:
        return 'Click to start conversation';
    }
  };

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {/* Voice Visualizer - shown when recording or playing */}
      <AnimatePresence>
        {(isRecording || isPlaying) && (
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <VoiceVisualizer
              className="w-32"
              showFrequencyBars={true}
              barCount={16}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Voice Button */}
      <motion.button
        className={`
          ${sizeClasses[size]}
          ${getButtonColor()}
          rounded-full shadow-lg transition-all duration-300
          focus:outline-none focus:ring-4 focus:ring-opacity-50
          active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
          ${isHovered ? 'shadow-xl' : 'shadow-lg'}
        `}
        onClick={handleToggleConversation}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={getButtonState() === 'initializing'}
        animate={{
          // Breathing animation for active states
          scale: conversationState === 'active' || conversationState === 'thinking'
            ? [1, 1.05, 1]
            : conversationState === 'connecting'
            ? [1, 1.02, 1]
            : 1,
          // Enhanced shadow effects
          boxShadow: (() => {
            switch (conversationState) {
              case 'connecting':
                return [
                  '0 10px 25px rgba(0, 255, 255, 0.3)',
                  '0 15px 35px rgba(0, 255, 255, 0.6)',
                  '0 10px 25px rgba(0, 255, 255, 0.3)',
                ];
              case 'active':
                return [
                  '0 10px 25px rgba(0, 255, 255, 0.4)',
                  '0 15px 35px rgba(255, 0, 255, 0.4)',
                  '0 10px 25px rgba(0, 255, 255, 0.4)',
                ];
              case 'thinking':
                return [
                  '0 10px 25px rgba(255, 0, 255, 0.4)',
                  '0 20px 40px rgba(255, 0, 255, 0.6)',
                  '0 10px 25px rgba(255, 0, 255, 0.4)',
                ];
              default:
                return undefined;
            }
          })(),
        }}
        transition={{
          duration: conversationState === 'connecting' ? 0.8 :
                   conversationState === 'active' || conversationState === 'thinking' ? 2.5 :
                   0.3,
          repeat: conversationState !== 'idle' ? Infinity : 0,
          ease: 'easeInOut'
        }}
      >
        {getButtonIcon()}
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute bottom-full mb-2 px-3 py-1 bg-black text-white text-xs rounded whitespace-nowrap"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
          >
            {getTooltipText()}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Indicators */}
      <div className="flex mt-2 space-x-1">
        {/* Permission status */}
        <div
          className={`w-2 h-2 rounded-full ${
            isPermissionGranted ? 'bg-green-400' : 'bg-red-400'
          }`}
          title={isPermissionGranted ? 'Permission granted' : 'Permission needed'}
        />

        {/* Initialization status */}
        <div
          className={`w-2 h-2 rounded-full ${
            isInitialized ? 'bg-green-400' : 'bg-yellow-400'
          }`}
          title={isInitialized ? 'Audio initialized' : 'Initializing...'}
        />

        {/* Speech detection status */}
        {isRecording && (
          <div
            className={`w-2 h-2 rounded-full ${
              speechDetected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`}
            title={speechDetected ? 'Speech detected' : 'No speech'}
          />
        )}
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          className="absolute top-full mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-xs rounded max-w-xs"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error.message}
        </motion.div>
      )}

      {/* Audio Settings Modal */}
      <AudioSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default VoiceButton;