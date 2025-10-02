import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  useRecordingStatus,
  usePlayingStatus,
  useMicrophoneLevel,
  useSpeechDetected
} from '../store/appStore';
import { useAudioVisualization } from '../hooks/useAudio';
import { AudioVisualizationData } from '../services/audioManager';

interface VoiceVisualizerProps {
  className?: string;
  showFrequencyBars?: boolean;
  showTimeDomain?: boolean;
  barCount?: number;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  className = '',
  showFrequencyBars = true,
  showTimeDomain = false,
  barCount = 12
}) => {
  const isRecording = useRecordingStatus();
  const isPlaying = usePlayingStatus();
  const microphoneLevel = useMicrophoneLevel();
  const speechDetected = useSpeechDetected();

  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(barCount));
  const [timeData, setTimeData] = useState<Uint8Array>(new Uint8Array(barCount));

  // Set up real-time audio visualization callback
  const handleVisualizationData = useCallback((data: AudioVisualizationData) => {
    if (!data.frequencyData.length || !data.timeData.length) return;

    // Resample frequency data to match bar count
    const resampledFreq = resampleAudioData(data.frequencyData, barCount);
    setFrequencyData(resampledFreq);

    if (showTimeDomain) {
      const resampledTime = resampleAudioData(data.timeData, barCount);
      setTimeData(resampledTime);
    }
  }, [barCount, showTimeDomain]);

  useAudioVisualization(handleVisualizationData);

  const bars = useMemo(() => Array.from({ length: barCount }, (_, i) => i), [barCount]);

  // Calculate dynamic bar heights based on real audio data
  const getBarHeight = useCallback((barIndex: number) => {
    if (showFrequencyBars && frequencyData.length > 0) {
      // Use actual frequency data
      const normalizedValue = frequencyData[barIndex] / 255;
      return Math.max(0.2, normalizedValue * 2); // Scale 0.2 to 2.0
    } else if (showTimeDomain && timeData.length > 0) {
      // Use time domain data
      const normalizedValue = Math.abs((timeData[barIndex] - 128) / 128);
      return Math.max(0.2, normalizedValue * 1.5); // Scale 0.2 to 1.5
    } else {
      // Fallback to RMS level for simple visualization
      const normalizedLevel = Math.max(0, (microphoneLevel + 60) / 60); // Convert dB to 0-1
      const randomVariation = 0.8 + Math.random() * 0.4; // Add some randomness
      return Math.max(0.2, normalizedLevel * randomVariation * 1.5);
    }
  }, [showFrequencyBars, showTimeDomain, frequencyData, timeData, microphoneLevel]);

  const barVariants = {
    idle: {
      scaleY: 0.3,
      opacity: 0.3,
    },
    recording: {
      scaleY: 1,
      opacity: 1,
      transition: {
        duration: 0.1,
        ease: 'easeOut',
      },
    },
    playing: {
      scaleY: 1,
      opacity: 1,
      transition: {
        duration: 0.1,
        ease: 'easeOut',
      },
    },
  };

  const getAnimationState = () => {
    if (isRecording) return 'recording';
    if (isPlaying) return 'playing';
    return 'idle';
  };

  const getBarColor = () => {
    if (isRecording) {
      return speechDetected
        ? 'bg-gradient-to-t from-green-500 to-green-300' // Green when speech detected
        : 'bg-gradient-to-t from-red-500 to-red-300'; // Red when recording but no speech
    } else if (isPlaying) {
      return 'bg-gradient-to-t from-cyan-500 to-blue-400'; // Blue/cyan for playback
    } else {
      return 'bg-gray-600'; // Gray when idle
    }
  };

  return (
    <div className={`flex items-end justify-center space-x-1 ${className}`}>
      {bars.map((bar) => {
        const barHeight = getBarHeight(bar);

        return (
          <motion.div
            key={bar}
            className={`w-2 rounded-full transition-colors duration-200 ${getBarColor()}`}
            variants={barVariants}
            animate={getAnimationState()}
            style={{
              originY: 1,
              height: '32px', // Base height
              scaleY: barHeight,
            }}
            transition={{
              delay: bar * 0.02, // Reduced delay for smoother wave effect
            }}
          />
        );
      })}

      {/* Speech detection indicator */}
      {isRecording && speechDetected && (
        <div className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      )}

      {/* RMS level indicator */}
      {(isRecording || isPlaying) && microphoneLevel > -60 && (
        <div className="absolute bottom-0 left-0 text-xs text-gray-400">
          {Math.round(microphoneLevel)} dB
        </div>
      )}
    </div>
  );
};

// Utility function to resample audio data
function resampleAudioData(data: Uint8Array, targetLength: number): Uint8Array {
  if (data.length === 0) return new Uint8Array(targetLength);

  const result = new Uint8Array(targetLength);
  const step = data.length / targetLength;

  for (let i = 0; i < targetLength; i++) {
    const sourceIndex = Math.floor(i * step);
    result[i] = data[sourceIndex] || 0;
  }

  return result;
}

export default VoiceVisualizer;