import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useRecordingStatus,
  usePlayingStatus,
  useAudioPermissionGranted,
  useAudioInitialized,
  useSpeechDetected
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
  const isPermissionGranted = useAudioPermissionGranted();
  const isInitialized = useAudioInitialized();
  const speechDetected = useSpeechDetected();

  const [showSettings, setShowSettings] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [pressStartTime, setPressStartTime] = useState<number | null>(null);

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle press and hold for recording
  const handleMouseDown = useCallback(async () => {
    if (isRecording || isPlaying) return;

    setPressStartTime(Date.now());

    // Start a timer to begin recording after 200ms hold
    pressTimerRef.current = setTimeout(async () => {
      try {
        if (!isPermissionGranted) {
          await requestPermission();
        }
        await startRecording();
      } catch (err) {
        console.error('Failed to start recording:', err);
      }
    }, 200);
  }, [isRecording, isPlaying, isPermissionGranted, requestPermission, startRecording]);

  const handleMouseUp = useCallback(() => {
    const pressDuration = pressStartTime ? Date.now() - pressStartTime : 0;

    // Clear the timer
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    setPressStartTime(null);

    // If we were recording, stop it
    if (isRecording) {
      stopRecording();
    }

    // If it was a quick press (< 200ms), show settings
    if (pressDuration < 200 && !isRecording) {
      setShowSettings(true);
    }
  }, [isRecording, pressStartTime, stopRecording]);

  // Handle mouse leave (cancel recording if mouse leaves while pressed)
  const handleMouseLeave = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    if (isRecording) {
      stopRecording();
    }

    setPressStartTime(null);
    setIsHovered(false);
  }, [isRecording, stopRecording]);

  // Get button state for styling
  const getButtonState = () => {
    if (isRecording) return 'recording';
    if (isPlaying) return 'playing';
    if (!isPermissionGranted) return 'permission-needed';
    if (!isInitialized) return 'initializing';
    return 'idle';
  };

  const getButtonColor = () => {
    const state = getButtonState();
    switch (state) {
      case 'recording':
        return speechDetected
          ? 'bg-green-500 hover:bg-green-600 shadow-green-500/50'
          : 'bg-red-500 hover:bg-red-600 shadow-red-500/50';
      case 'playing':
        return 'bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/50';
      case 'permission-needed':
        return 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/50';
      case 'initializing':
        return 'bg-gray-500 shadow-gray-500/50';
      case 'idle':
      default:
        return 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/50';
    }
  };

  const getButtonIcon = () => {
    const state = getButtonState();
    switch (state) {
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
      case 'playing':
        return (
          <svg className={`${iconSizeClasses[size]} text-white`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
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
      case 'recording':
        return 'Recording... Release to stop';
      case 'playing':
        return 'Playing audio response';
      case 'permission-needed':
        return 'Click to grant microphone permission';
      case 'initializing':
        return 'Initializing audio system...';
      default:
        return 'Hold to record, click for settings';
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
          rounded-full shadow-lg transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-opacity-50
          active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
          ${isHovered ? 'shadow-xl' : 'shadow-lg'}
        `}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={getButtonState() === 'initializing'}
        animate={{
          scale: isRecording ? [1, 1.05, 1] : 1,
          boxShadow: isRecording
            ? [
                '0 10px 25px rgba(239, 68, 68, 0.5)',
                '0 15px 35px rgba(239, 68, 68, 0.7)',
                '0 10px 25px rgba(239, 68, 68, 0.5)',
              ]
            : undefined,
        }}
        transition={{
          duration: 1,
          repeat: isRecording ? Infinity : 0,
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