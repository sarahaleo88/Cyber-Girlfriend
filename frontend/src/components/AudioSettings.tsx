import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  useUser,
  useAvailableAudioDevices,
  useAudioPermissionGranted,
  useAudioInitialized,
  useMicrophoneLevel,
  useAudioActions
} from '../store/appStore';
import { useAudio } from '../hooks/useAudio';
import { AudioDevice } from '../types';

interface AudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const AudioSettings: React.FC<AudioSettingsProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const user = useUser();
  const availableDevices = useAvailableAudioDevices();
  const isPermissionGranted = useAudioPermissionGranted();
  const isInitialized = useAudioInitialized();
  const microphoneLevel = useMicrophoneLevel();
  const audioActions = useAudioActions();

  const {
    requestPermission,
    getDevices,
    selectMicrophone,
    setMicrophoneGain,
    setVADThreshold,
    error
  } = useAudio();

  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
  const [micGain, setMicGain] = useState<number>(1.0);
  const [vadThreshold, setVadThreshold] = useState<number>(-40);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load current settings from user preferences
  useEffect(() => {
    if (user?.preferences?.voiceSettings) {
      const settings = user.preferences.voiceSettings;
      setMicGain(settings.microphoneGain || 1.0);
      setVadThreshold(settings.vadThreshold || -40);
      setSelectedMicrophone(settings.selectedMicrophone || '');
      setSelectedSpeaker(settings.selectedSpeaker || '');
    }
  }, [user]);

  // Update error message
  useEffect(() => {
    if (error) {
      setErrorMessage(error.message);
    } else {
      setErrorMessage('');
    }
  }, [error]);

  const handleRequestPermission = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      await requestPermission();
      await getDevices();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to request permissions');
    } finally {
      setIsLoading(false);
    }
  }, [requestPermission, getDevices]);

  const handleMicrophoneSelect = useCallback(async (deviceId: string) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      await selectMicrophone(deviceId);
      setSelectedMicrophone(deviceId);
      // TODO: Update user preferences in store
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to select microphone');
    } finally {
      setIsLoading(false);
    }
  }, [selectMicrophone]);

  const handleMicGainChange = useCallback((gain: number) => {
    setMicGain(gain);
    setMicrophoneGain(gain);
    // TODO: Update user preferences in store
  }, [setMicrophoneGain]);

  const handleVADThresholdChange = useCallback((threshold: number) => {
    setVadThreshold(threshold);
    setVADThreshold(threshold);
    // TODO: Update user preferences in store
  }, [setVADThreshold]);

  const inputDevices = availableDevices.filter(device => device.kind === 'audioinput');
  const outputDevices = availableDevices.filter(device => device.kind === 'audiooutput');

  if (!isOpen) return null;

  return (
    <motion.div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Audio Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Permission Status */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Microphone Permission
              </span>
              <div className={`w-3 h-3 rounded-full ${isPermissionGranted ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>

            {!isPermissionGranted && (
              <button
                onClick={handleRequestPermission}
                disabled={isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-2 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Requesting...' : 'Grant Microphone Permission'}
              </button>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {errorMessage}
            </div>
          )}

          {isPermissionGranted && isInitialized && (
            <>
              {/* Microphone Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Microphone
                </label>
                <select
                  value={selectedMicrophone}
                  onChange={(e) => handleMicrophoneSelect(e.target.value)}
                  disabled={isLoading}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select microphone...</option>
                  {inputDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speaker Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Speaker
                </label>
                <select
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Default speaker</option>
                  {outputDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Microphone Gain */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Microphone Gain: {micGain.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={micGain}
                  onChange={(e) => handleMicGainChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* VAD Threshold */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Voice Detection Threshold: {vadThreshold} dB
                </label>
                <input
                  type="range"
                  min="-60"
                  max="0"
                  step="1"
                  value={vadThreshold}
                  onChange={(e) => handleVADThresholdChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Audio Level Indicator */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Microphone Level
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(microphoneLevel)} dB
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-200 ${
                      microphoneLevel > vadThreshold
                        ? 'bg-green-500'
                        : microphoneLevel > -50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, (microphoneLevel + 60) * 1.67))}%`
                    }}
                  />
                </div>
              </div>

              {/* Audio Info */}
              <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Status: {isInitialized ? 'Initialized' : 'Not initialized'}</div>
                  <div>Devices: {availableDevices.length} found</div>
                  <div>Sample Rate: 24kHz (OpenAI optimized)</div>
                  <div>Format: PCM16 Mono</div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Close
            </button>
            {isPermissionGranted && (
              <button
                onClick={() => getDevices()}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                Refresh Devices
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AudioSettings;