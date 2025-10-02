import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, useCurrentConversation, useRecordingStatus, usePlayingStatus } from '../store/appStore';
import { Message as MessageType, EmotionType } from '../types';
import MessageList from './MessageList';
import VoiceVisualizer from './VoiceVisualizer';
import Avatar from './Avatar';

interface ConversationInterfaceProps {
  className?: string;
  showAvatar?: boolean;
  showVoiceVisualizer?: boolean;
  autoScroll?: boolean;
  onSendMessage?: (content: string, type?: 'text' | 'audio') => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  isTyping?: boolean;
  typingMessage?: string;
}

const ConversationInterface: React.FC<ConversationInterfaceProps> = ({
  className = '',
  showAvatar = true,
  showVoiceVisualizer = true,
  autoScroll = true,
  onSendMessage,
  onStartRecording,
  onStopRecording,
  isTyping = false,
  typingMessage
}) => {
  const {
    currentConversation,
    addMessage,
    setRecording,
    setEmotion,
    currentEmotion,
    startConversation
  } = useAppStore();

  const isRecording = useRecordingStatus();
  const isPlaying = usePlayingStatus();
  const [messageStatus, setMessageStatus] = useState<'idle' | 'sending' | 'processing'>('idle');

  // Initialize conversation if not exists
  useEffect(() => {
    if (!currentConversation) {
      startConversation();
    }
  }, [currentConversation, startConversation]);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string, type: 'text' | 'audio' = 'text') => {
    if (!content.trim() || !currentConversation) return;

    try {
      setMessageStatus('sending');

      // Add user message
      addMessage({
        content,
        sender: 'user',
        type,
        status: 'sending'
      });

      // Call external handler if provided
      if (onSendMessage) {
        await onSendMessage(content, type);
      }

      setMessageStatus('processing');

      // Simulate AI thinking time (in real app, this would be handled by WebSocket)
      setTimeout(() => {
        setMessageStatus('idle');
      }, 1000);

    } catch (error) {
      console.error('Failed to send message:', error);
      setMessageStatus('idle');
    }
  }, [currentConversation, addMessage, onSendMessage]);

  // Handle recording toggle
  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      setRecording(false);
      onStopRecording?.();
    } else {
      setRecording(true);
      onStartRecording?.();
    }
  }, [isRecording, setRecording, onStartRecording, onStopRecording]);

  // Handle AI emotion changes
  const handleEmotionChange = useCallback((emotion: EmotionType) => {
    setEmotion(emotion);
  }, [setEmotion]);

  // Add demo AI response (in real app, this would come from WebSocket)
  const handleAddDemoResponse = useCallback(() => {
    if (!currentConversation) return;

    const responses = [
      { content: "Hello! I'm excited to chat with you! How are you feeling today?", emotion: 'happy' as EmotionType },
      { content: "That sounds really interesting! Tell me more about it.", emotion: 'thoughtful' as EmotionType },
      { content: "I understand how you feel. I'm here to listen and support you.", emotion: 'calm' as EmotionType },
      { content: "Haha, that's so funny! You always make me smile! 😊", emotion: 'playful' as EmotionType },
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    addMessage({
      content: randomResponse.content,
      sender: 'ai',
      type: 'text',
      emotion: randomResponse.emotion
    });

    handleEmotionChange(randomResponse.emotion);
  }, [currentConversation, addMessage, handleEmotionChange]);

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25
      }
    }
  };

  const controlsVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.2,
        type: 'spring',
        stiffness: 300,
        damping: 25
      }
    }
  };

  if (!currentConversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyber-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Initializing conversation...</p>
        </div>
      </div>
    );
  }

  const getRecordingButtonText = () => {
    if (isRecording) return '🛑 Stop Recording';
    if (isTyping) return '⏳ AI Responding...';
    return '🎤 Start Recording';
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className={`flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl shadow-2xl overflow-hidden ${className}`}
    >
      {/* Header with Avatar and Status */}
      {showAvatar && (
        <div className="flex-shrink-0 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600 p-4">
          <div className="flex items-center justify-center space-x-4">
            <Avatar
              size="md"
              emotion={currentEmotion}
              className="ring-2 ring-cyan-400 ring-opacity-50"
            />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">Your AI Companion</h2>
              <p className="text-sm text-cyan-300 capitalize">
                Feeling {currentEmotion}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 min-h-0">
        <MessageList
          messages={currentConversation.messages}
          isTyping={isTyping || messageStatus === 'processing'}
          autoScroll={autoScroll}
          className="h-full"
        />
      </div>

      {/* Voice Visualizer and Controls */}
      <motion.div
        variants={controlsVariants}
        className="flex-shrink-0 bg-gradient-to-r from-gray-800 to-gray-700 border-t border-gray-600 p-4"
      >
        {/* Voice Visualizer */}
        {showVoiceVisualizer && (
          <div className="mb-4">
            <VoiceVisualizer
              className="h-16 justify-center"
              barCount={16}
              showFrequencyBars={true}
            />
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center space-x-4">
          {/* Recording Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleRecording}
            disabled={isTyping || messageStatus !== 'idle'}
            className={`
              px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 shadow-lg
              ${isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white ring-2 ring-red-300 ring-opacity-50'
                : isTyping || messageStatus !== 'idle'
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white hover:shadow-xl'
              }
            `}
          >
            {getRecordingButtonText()}
          </motion.button>

          {/* Demo Response Button (for development) */}
          {process.env.NODE_ENV === 'development' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddDemoResponse}
              disabled={isTyping || messageStatus !== 'idle'}
              className="px-4 py-2 bg-cyber-purple hover:bg-purple-600 text-white text-sm rounded-lg transition-colors duration-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Demo AI Response
            </motion.button>
          )}
        </div>

        {/* Status Text */}
        <AnimatePresence mode="wait">
          {(isRecording || isTyping || messageStatus !== 'idle') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mt-3"
            >
              <p className="text-sm text-gray-400">
                {isRecording && 'Listening... speak now'}
                {!isRecording && isTyping && (typingMessage || 'AI is thinking...')}
                {!isRecording && !isTyping && messageStatus === 'sending' && 'Sending message...'}
                {!isRecording && !isTyping && messageStatus === 'processing' && 'Processing your message...'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default React.memo(ConversationInterface);