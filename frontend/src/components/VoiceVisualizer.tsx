import React from 'react';
import { motion } from 'framer-motion';
import { useRecordingStatus, usePlayingStatus } from '../store/appStore';

interface VoiceVisualizerProps {
  className?: string;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ className = '' }) => {
  const isRecording = useRecordingStatus();
  const isPlaying = usePlayingStatus();

  const bars = Array.from({ length: 12 }, (_, i) => i);

  const barVariants = {
    idle: {
      scaleY: 0.3,
      opacity: 0.3,
    },
    recording: {
      scaleY: [0.3, 1.5, 0.8, 1.2, 0.4, 1.0],
      opacity: [0.3, 1, 0.8, 1, 0.6, 0.9],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
        times: [0, 0.2, 0.4, 0.6, 0.8, 1],
      },
    },
    playing: {
      scaleY: [0.4, 1.2, 0.6, 1.8, 0.3, 1.4],
      opacity: [0.4, 1, 0.7, 1, 0.5, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
        times: [0, 0.2, 0.4, 0.6, 0.8, 1],
      },
    },
  };

  const getAnimationState = () => {
    if (isRecording) return 'recording';
    if (isPlaying) return 'playing';
    return 'idle';
  };

  return (
    <div className={`flex items-end justify-center space-x-1 ${className}`}>
      {bars.map((bar) => (
        <motion.div
          key={bar}
          className={`
            w-2 h-8 rounded-full
            ${isRecording
              ? 'bg-gradient-to-t from-red-500 to-red-300'
              : isPlaying
                ? 'bg-gradient-to-t from-cyber-purple to-cyber-pink'
                : 'bg-gray-600'
            }
          `}
          variants={barVariants}
          animate={getAnimationState()}
          style={{
            originY: 1,
            // Stagger the animation for each bar
            animationDelay: `${bar * 0.1}s`,
          }}
          transition={{
            delay: bar * 0.05,
          }}
        />
      ))}
    </div>
  );
};

export default VoiceVisualizer;