import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Personality {
  id: string;
  name: string;
  description: string;
  traits: {
    playfulness: number;
    empathy: number;
    humor: number;
    intelligence: number;
    supportiveness: number;
  };
}

interface PersonalitySelectorProps {
  currentPersonalityId?: string;
  onPersonalityChange?: (personalityId: string) => void;
  className?: string;
}

const PersonalitySelector: React.FC<PersonalitySelectorProps> = ({
  currentPersonalityId = 'friendly',
  onPersonalityChange,
  className = '',
}) => {
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [selectedId, setSelectedId] = useState(currentPersonalityId);
  const [isLoading, setIsLoading] = useState(true);
  const [preview, setPreview] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchPersonalities();
  }, []);

  const fetchPersonalities = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/personality');
      const data = await response.json();
      if (data.success) {
        setPersonalities(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch personalities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonalitySelect = async (personalityId: string) => {
    setSelectedId(personalityId);
    
    try {
      const response = await fetch('http://localhost:8000/api/personality/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalityId }),
      });
      
      const data = await response.json();
      if (data.success && onPersonalityChange) {
        onPersonalityChange(personalityId);
      }
    } catch (error) {
      console.error('Failed to switch personality:', error);
    }
  };

  const handlePreview = async (personalityId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/personality/${personalityId}/preview`);
      const data = await response.json();
      if (data.success) {
        setPreview(data.data.preview);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Failed to fetch preview:', error);
    }
  };

  const getPersonalityIcon = (id: string) => {
    const icons: Record<string, string> = {
      friendly: '😊',
      professional: '💼',
      playful: '🎉',
    };
    return icons[id] || '🤖';
  };

  const getPersonalityColor = (id: string) => {
    const colors: Record<string, string> = {
      friendly: 'from-pink-500 to-rose-500',
      professional: 'from-blue-500 to-indigo-500',
      playful: 'from-purple-500 to-fuchsia-500',
    };
    return colors[id] || 'from-gray-500 to-gray-600';
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className={`personality-selector ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Choose Your AI Companion</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {personalities.map((personality) => (
          <motion.div
            key={personality.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative cursor-pointer rounded-xl p-4 transition-all ${
              selectedId === personality.id
                ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/50'
                : 'hover:ring-1 hover:ring-purple-400'
            }`}
            onClick={() => handlePersonalitySelect(personality.id)}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${getPersonalityColor(
                personality.id
              )} opacity-10 rounded-xl`}
            ></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-4xl">{getPersonalityIcon(personality.id)}</span>
                {selectedId === personality.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </motion.div>
                )}
              </div>
              
              <h4 className="text-white font-semibold mb-1">{personality.name}</h4>
              <p className="text-gray-300 text-sm mb-3">{personality.description}</p>
              
              {/* Trait bars */}
              <div className="space-y-1">
                {Object.entries(personality.traits).slice(0, 3).map(([trait, value]) => (
                  <div key={trait} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 capitalize w-24">{trait}</span>
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className={`h-full bg-gradient-to-r ${getPersonalityColor(personality.id)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(personality.id);
                }}
                className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Preview →
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-white font-semibold mb-3">Personality Preview</h4>
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <p className="text-gray-200">{preview}</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PersonalitySelector;

