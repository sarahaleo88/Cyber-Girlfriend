import React, { useEffect, useRef, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Message as MessageType } from '../types';
import Message from './Message';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: MessageType[];
  isTyping?: boolean;
  isLoading?: boolean;
  className?: string;
  autoScroll?: boolean;
  showScrollToBottom?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isTyping = false,
  isLoading = false,
  className = '',
  autoScroll = true,
  showScrollToBottom = true,
  onLoadMore,
  hasMore = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom for new messages
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  }, []);

  // Handle scroll events to detect user scrolling
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5;

    setShowScrollButton(!isAtBottom && showScrollToBottom);

    if (!isAtBottom) {
      setIsUserScrolling(true);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set user back to not scrolling after 2 seconds of inactivity
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 2000);
    } else {
      setIsUserScrolling(false);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    }

    // Load more messages when near the top (infinite scroll up)
    if (scrollTop < 100 && onLoadMore && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [showScrollToBottom, onLoadMore, hasMore, isLoading]);

  // Auto-scroll when new messages arrive (but not if user is actively scrolling)
  useEffect(() => {
    if (autoScroll && !isUserScrolling && messages.length > 0) {
      // Small delay to ensure message is rendered
      const timeoutId = setTimeout(() => scrollToBottom(), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, autoScroll, isUserScrolling, scrollToBottom]);

  // Auto-scroll when typing indicator appears/disappears
  useEffect(() => {
    if (autoScroll && !isUserScrolling && isTyping) {
      const timeoutId = setTimeout(() => scrollToBottom(), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isTyping, autoScroll, isUserScrolling, scrollToBottom]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const scrollButtonVariants = {
    initial: { opacity: 0, scale: 0.8, y: 20 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <div className={`relative flex flex-col h-full ${className}`}>
      {/* Loading indicator for loading more messages */}
      {isLoading && hasMore && (
        <div className="flex justify-center py-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-cyber-purple border-t-transparent rounded-full"
          />
        </div>
      )}

      {/* Messages container */}
      <motion.div
        ref={scrollContainerRef}
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth"
        onScroll={handleScroll}
        style={{
          scrollBehavior: 'smooth'
        }}
      >
        {messages.length === 0 && !isTyping ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center py-12"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-cyber-purple to-cyber-pink rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              Start Your Conversation
            </h3>
            <p className="text-gray-500 max-w-md">
              Say hello to begin chatting with your AI companion. She's ready to listen and respond!
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                />
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <TypingIndicator isVisible={isTyping} />
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </motion.div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            variants={scrollButtonVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => scrollToBottom()}
            className="absolute bottom-4 right-4 w-12 h-12 bg-cyber-purple bg-opacity-90 backdrop-blur-sm text-white rounded-full shadow-lg hover:bg-opacity-100 transition-colors duration-200 flex items-center justify-center z-10 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ⬇️
            </motion.div>

            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                Scroll to bottom
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(MessageList);