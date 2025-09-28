import React from 'react';
import { motion } from 'framer-motion';
import { useCurrentEmotion, usePlayingStatus } from '../store/appStore';
import { EmotionType } from '../types';

interface AvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ size = 'lg', className = '' }) => {
  const currentEmotion = useCurrentEmotion();
  const isPlaying = usePlayingStatus();

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  };

  const emotionColors: Record<EmotionType, string> = {
    happy: 'from-yellow-400 to-orange-500',
    sad: 'from-blue-400 to-indigo-600',
    excited: 'from-pink-400 to-red-500',
    calm: 'from-green-400 to-blue-500',
    thoughtful: 'from-purple-400 to-indigo-500',
    playful: 'from-pink-400 to-purple-500',
  };

  const pulseVariants = {
    idle: {
      scale: 1,
      opacity: 0.8,
    },
    speaking: {
      scale: [1, 1.1, 1],
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  const glowVariants = {
    idle: {
      boxShadow: '0 0 20px rgba(147, 51, 234, 0.3)',
    },
    speaking: {
      boxShadow: [
        '0 0 20px rgba(147, 51, 234, 0.3)',
        '0 0 40px rgba(147, 51, 234, 0.6)',
        '0 0 20px rgba(147, 51, 234, 0.3)',
      ],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className={`
          ${sizeClasses[size]}
          rounded-full
          bg-gradient-to-br ${emotionColors[currentEmotion]}
          flex items-center justify-center
          relative overflow-hidden
        `}
        variants={glowVariants}
        animate={isPlaying ? 'speaking' : 'idle'}
      >
        <motion.div
          className="absolute inset-2 rounded-full bg-gradient-to-br from-white/10 to-transparent"
          variants={pulseVariants}
          animate={isPlaying ? 'speaking' : 'idle'}
        />

        {/* Avatar face/expression */}
        <motion.div
          className="relative z-10 text-white text-center"
          animate={{ rotate: isPlaying ? [0, 2, -2, 0] : 0 }}
          transition={{ duration: 2, repeat: isPlaying ? Infinity : 0 }}
        >
          <div className="text-2xl mb-1">👁️‍🗨️</div>
          <div className="text-xs opacity-70">{currentEmotion}</div>
        </motion.div>
      </motion.div>

      {/* Outer ring animation */}
      <motion.div
        className={`
          absolute inset-0 ${sizeClasses[size]}
          rounded-full border-2 border-cyber-purple/30
        `}
        animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
};

export default Avatar;