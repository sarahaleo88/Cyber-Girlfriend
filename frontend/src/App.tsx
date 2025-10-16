import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore, useConnectionStatus } from './store/appStore'
import ConversationInterface from './components/ConversationInterface'
import SettingsPanel from './components/SettingsPanel'
import InstallPrompt from './components/InstallPrompt'

function App() {
  const { currentConversation, addMessage } = useAppStore()
  const isConnected = useConnectionStatus()
  const [isTyping, setIsTyping] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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

          {/* Connection Status and Settings Button */}
          <div className="flex items-center justify-center mb-4 gap-4">
            <div className="flex items-center">
              <motion.div
                className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                animate={{ scale: isConnected ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-sm text-gray-400">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-gray-400 hover:text-white transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
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

      {/* Settings Panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Install Prompt */}
      <InstallPrompt />
    </div>
  )
}

export default App