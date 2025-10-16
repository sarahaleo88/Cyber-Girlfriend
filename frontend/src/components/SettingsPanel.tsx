import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PersonalitySelector from './PersonalitySelector';
import AudioSettings from './AudioSettings';
import ExportDialog from './ExportDialog';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'personality' | 'audio' | 'privacy'>('personality');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const tabs = [
    { id: 'personality', label: 'Personality', icon: '🎭' },
    { id: 'audio', label: 'Audio', icon: '🎵' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-gray-900 shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Settings</h2>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-4 px-4 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-purple-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'personality' && (
                  <motion.div
                    key="personality"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PersonalitySelector
                      onPersonalityChange={(id) => {
                        console.log('Personality changed to:', id);
                      }}
                    />
                  </motion.div>
                )}

                {activeTab === 'audio' && (
                  <motion.div
                    key="audio"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AudioSettings isOpen={isOpen} onClose={onClose} />
                  </motion.div>
                )}

                {activeTab === 'privacy' && (
                  <motion.div
                    key="privacy"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Privacy Settings</h3>
                        <p className="text-gray-400 text-sm mb-4">
                          Your conversations are stored locally and never shared without your permission.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                          <div>
                            <h4 className="text-white font-medium">Save Conversations</h4>
                            <p className="text-gray-400 text-sm">Store conversation history locally</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                          <div>
                            <h4 className="text-white font-medium">Auto-Delete</h4>
                            <p className="text-gray-400 text-sm">Delete conversations after 30 days</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                        </div>

                        <div className="p-4 bg-gray-800 rounded-lg">
                          <h4 className="text-white font-medium mb-2">Data Export</h4>
                          <p className="text-gray-400 text-sm mb-3">
                            Download all your conversation data
                          </p>
                          <button
                            onClick={() => setIsExportDialogOpen(true)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors"
                          >
                            Export Data
                          </button>
                        </div>

                        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                          <h4 className="text-red-400 font-medium mb-2">Delete All Data</h4>
                          <p className="text-gray-400 text-sm mb-3">
                            Permanently delete all conversations and settings
                          </p>
                          <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors">
                            Delete Everything
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
              <p className="text-xs text-gray-500 text-center">
                Cyber Girlfriend v0.0.1 • Your privacy matters
              </p>
            </div>
          </motion.div>

          {/* Export Dialog */}
          <ExportDialog
            isOpen={isExportDialogOpen}
            onClose={() => setIsExportDialogOpen(false)}
            conversationId="current-conversation-id"
            conversationTitle="Current Conversation"
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsPanel;

