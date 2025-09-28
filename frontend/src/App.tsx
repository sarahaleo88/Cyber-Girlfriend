import React from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from './store/appStore'
import Avatar from './components/Avatar'
import VoiceVisualizer from './components/VoiceVisualizer'

function App() {
  const { startConversation, setRecording, currentConversation, isRecording, isConnected } = useAppStore()

  const handleStartConversation = () => {
    startConversation()
    // In a real app, this would initiate WebSocket connection
  }

  const handleToggleRecording = () => {
    setRecording(!isRecording)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">
            Cyber Girlfriend
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Your AI Voice Companion
          </p>

          {/* Avatar Section */}
          <div className="mb-8">
            <Avatar size="xl" className="mx-auto mb-4" />
            <VoiceVisualizer className="mb-6" />
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-center mb-6">
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {!currentConversation ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartConversation}
                className="btn-primary"
              >
                Start Conversation
              </motion.button>
            ) : (
              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToggleRecording}
                  className={`font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isRecording ? '🛑 Stop Recording' : '🎤 Start Recording'}
                </motion.button>

                <p className="text-gray-400 text-sm">
                  {isRecording ? 'Listening...' : 'Press to speak with your AI companion'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default App