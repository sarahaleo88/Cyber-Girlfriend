import React from 'react';
import { motion } from 'framer-motion';
import { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
  className?: string;
}

const Message: React.FC<MessageProps> = ({ message, className = '' }) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  const getStatusIcon = () => {
    if (isUser) {
      switch (message.status) {
        case 'sending':
          return (
            <motion.div
              className="w-3 h-3 rounded-full bg-yellow-500"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          );
        case 'sent':
          return <div className="w-3 h-3 rounded-full bg-blue-500" />;
        case 'received':
          return <div className="w-3 h-3 rounded-full bg-green-500" />;
        case 'error':
          return <div className="w-3 h-3 rounded-full bg-red-500" />;
        default:
          return null;
      }
    }
    return null;
  };

  const getEmotionColor = () => {
    if (!message.emotion || isUser) return '';

    switch (message.emotion) {
      case 'happy':
        return 'border-l-yellow-400';
      case 'sad':
        return 'border-l-blue-400';
      case 'excited':
        return 'border-l-pink-400';
      case 'calm':
        return 'border-l-green-400';
      case 'thoughtful':
        return 'border-l-purple-400';
      case 'playful':
        return 'border-l-cyan-400';
      default:
        return 'border-l-gray-400';
    }
  };

  const messageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }
    },
    exit: { opacity: 0, y: -10, scale: 0.95 }
  };

  if (isSystem) {
    return (
      <motion.div
        variants={messageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`flex justify-center mb-4 ${className}`}
      >
        <div className="bg-gray-700 bg-opacity-50 px-4 py-2 rounded-full text-sm text-gray-300 max-w-xs">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'} ${className}`}
    >
      <div className={`flex flex-col max-w-xs lg:max-w-md xl:max-w-lg ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message bubble */}
        <div
          className={`
            px-4 py-3 rounded-2xl shadow-lg border-l-4 backdrop-blur-sm
            ${isUser
              ? 'bg-gradient-to-br from-cyber-purple to-cyber-pink text-white border-l-cyber-pink'
              : `bg-gray-800 bg-opacity-80 text-gray-100 ${getEmotionColor()}`
            }
            ${message.type === 'audio' ? 'border-2 border-dashed border-cyan-400' : ''}
          `}
        >
          {/* Audio message indicator */}
          {message.type === 'audio' && (
            <div className="flex items-center mb-2 text-cyan-400">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                🎵
              </motion.div>
              <span className="ml-2 text-xs">Audio Message</span>
            </div>
          )}

          {/* Message content */}
          <p className="text-sm lg:text-base leading-relaxed break-words">
            {message.content}
          </p>

          {/* Audio player for audio messages */}
          {message.audioUrl && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <audio
                controls
                className="w-full h-8"
                preload="metadata"
              >
                <source src={message.audioUrl} type="audio/webm" />
                <source src={message.audioUrl} type="audio/mp3" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>

        {/* Message metadata */}
        <div className={`flex items-center mt-1 space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {/* Timestamp */}
          <span className="text-xs text-gray-500">
            {formatTimestamp(message.timestamp)}
          </span>

          {/* Status indicator for user messages */}
          {getStatusIcon()}

          {/* Emotion indicator for AI messages */}
          {!isUser && message.emotion && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs px-2 py-1 rounded-full bg-gray-700 bg-opacity-50 text-gray-400 capitalize"
            >
              {message.emotion}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(Message);