import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypingIndicatorProps {
  isVisible: boolean;
  className?: string;
  message?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isVisible,
  className = '',
  message = 'AI is thinking...'
}) => {
  const dotVariants = {
    initial: { opacity: 0.3, y: 0 },
    animate: {
      opacity: 1,
      y: [0, -8, 0],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  const containerVariants = {
    initial: { opacity: 0, y: 20, scale: 0.8 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.8,
      transition: {
        duration: 0.2
      }
    }
  };

  const pulseVariants = {
    initial: { scale: 1, opacity: 0.5 },
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={`flex justify-start mb-4 ${className}`}
        >
          <div className="flex flex-col max-w-xs lg:max-w-md xl:max-w-lg">
            {/* Typing indicator bubble */}
            <div className="px-4 py-3 rounded-2xl shadow-lg border-l-4 border-l-cyan-400 bg-gray-800 bg-opacity-80 backdrop-blur-sm">
              <div className="flex items-center space-x-1">
                {/* Animated typing dots */}
                <div className="flex space-x-1">
                  {[0, 1, 2].map((index) => (
                    <motion.div
                      key={index}
                      variants={dotVariants}
                      initial="initial"
                      animate="animate"
                      style={{
                        animationDelay: `${index * 0.2}s`
                      }}
                      className="w-2 h-2 bg-cyan-400 rounded-full"
                    />
                  ))}
                </div>

                {/* Typing message */}
                <motion.span
                  className="text-sm text-cyan-300 ml-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {message}
                </motion.span>
              </div>
            </div>

            {/* Additional visual feedback */}
            <div className="flex items-center mt-1 space-x-2">
              {/* Pulsing activity indicator */}
              <motion.div
                variants={pulseVariants}
                initial="initial"
                animate="animate"
                className="w-2 h-2 rounded-full bg-cyan-400"
              />

              <span className="text-xs text-gray-500">
                Processing...
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(TypingIndicator);