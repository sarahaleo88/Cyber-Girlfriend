import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore, useConnectionStatus } from './store/appStore'
import ConversationInterface from './components/ConversationInterface'

function App() {
  const { currentConversation, addMessage } = useAppStore()
  const isConnected = useConnectionStatus()
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = async (content: string, type: 'text' | 'audio' = 'text') => {
    // Simulate API call delay
    setIsTyping(true)

    // In a real app, this would send to WebSocket/API
    console.log('Sending message:', { content, type })

    // Simulate AI response after delay
    setTimeout(() => {
      const aiResponses = [
        "That's really interesting! Tell me more about it.",
        "I understand how you feel. I'm here to listen.",
        "Thanks for sharing that with me! What else is on your mind?",
        "That sounds exciting! How did that make you feel?",
        "I appreciate you opening up to me. You're really thoughtful!"
      ]

      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)]
      const emotions = ['happy', 'thoughtful', 'calm', 'friendly', 'playful'] as const
      const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)]

      addMessage({
        content: randomResponse,
        sender: 'ai',
        type: 'text',
        emotion: randomEmotion
      })

      setIsTyping(false)
    }, 1500 + Math.random() * 2000) // Random delay 1.5-3.5 seconds
  }

  const handleStartRecording = () => {
    console.log('Starting recording...')
    // In a real app, this would start audio recording
  }

  const handleStopRecording = () => {
    console.log('Stopping recording...')
    // In a real app, this would stop recording and process audio

    // Simulate voice-to-text result
    setTimeout(() => {
      handleSendMessage("Hello, this is a voice message!", 'audio')
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-2">
            Cyber Girlfriend
          </h1>
          <p className="text-lg text-gray-300 mb-4">
            Your AI Voice Companion
          </p>

          {/* Connection Status */}
          <div className="flex items-center justify-center mb-4">
            <motion.div
              className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              animate={{ scale: isConnected ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </motion.div>

        {/* Main Conversation Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex-1 min-h-0"
        >
          <ConversationInterface
            className="h-full max-w-4xl mx-auto"
            showAvatar={true}
            showVoiceVisualizer={true}
            autoScroll={true}
            onSendMessage={handleSendMessage}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            isTyping={isTyping}
            typingMessage="Your AI companion is thinking..."
          />
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-4 text-xs text-gray-500"
        >
          <p>Powered by AI • Press and hold to speak • Your conversations are private</p>
        </motion.div>
      </div>
    </div>
  )
}

export default App