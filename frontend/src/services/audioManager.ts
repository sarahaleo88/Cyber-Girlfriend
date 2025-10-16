/**
 * AudioManager - Comprehensive Web Audio API integration
 * Handles microphone capture, audio processing, playback, and visualization
 */

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bufferSize: number;
  vadThreshold: number;
}

export interface AudioVisualizationData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  rmsLevel: number;
  isSpeechDetected: boolean;
}

export class VoiceActivityDetector {
  private vadThreshold: number;
  private noiseFloor: number = -60;
  private speechTimeout: number = 500; // ms
  private lastSpeechTime: number = 0;
  private rmsHistory: number[] = [];
  private readonly historySize = 10;

  constructor(vadThreshold: number = -40) {
    this.vadThreshold = vadThreshold;
  }

  detectSpeech(audioData: Float32Array): boolean {
    const rms = this.calculateRMS(audioData);
    const dbLevel = this.amplitudeToDb(rms);

    // Add to rolling history
    this.rmsHistory.push(dbLevel);
    if (this.rmsHistory.length > this.historySize) {
      this.rmsHistory.shift();
    }

    // Apply noise gate and speech detection
    const isSpeech = this.applyNoiseGate(dbLevel);

    if (isSpeech) {
      this.lastSpeechTime = Date.now();
      return true;
    }

    // Check if we're still within speech timeout
    return (Date.now() - this.lastSpeechTime) < this.speechTimeout;
  }

  private calculateRMS(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  private amplitudeToDb(amplitude: number): number {
    return 20 * Math.log10(Math.max(amplitude, 0.00001));
  }

  private applyNoiseGate(dbLevel: number): boolean {
    // Adaptive threshold based on recent noise floor
    const avgNoise = this.rmsHistory.length > 0
      ? this.rmsHistory.reduce((a, b) => a + b, 0) / this.rmsHistory.length
      : this.noiseFloor;

    const adaptiveThreshold = Math.max(avgNoise + 10, this.vadThreshold);
    return dbLevel > adaptiveThreshold;
  }

  setThreshold(threshold: number): void {
    this.vadThreshold = threshold;
  }

  getCurrentLevel(): number {
    return this.rmsHistory.length > 0
      ? this.rmsHistory[this.rmsHistory.length - 1]
      : this.noiseFloor;
  }
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private vad: VoiceActivityDetector;

  private isInitialized = false;
  private isRecording = false;
  private isPlaying = false;

  private audioChunks: Blob[] = [];
  private recordingStartTime = 0;
  private recordingCallback?: (audioData: ArrayBuffer) => void;
  private visualizationCallback?: (data: AudioVisualizationData) => void;
  private errorCallback?: (error: Error) => void;

  // Audio configuration - optimized for OpenAI Realtime API
  private readonly config: AudioConfig = {
    sampleRate: 24000, // OpenAI requirement
    channels: 1, // Mono
    bufferSize: 2048, // Low latency
    vadThreshold: -40 // dB threshold for speech detection
  };

  constructor() {
    this.vad = new VoiceActivityDetector(this.config.vadThreshold);
  }

  /**
   * Initialize the AudioManager with proper error handling
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Check Web Audio API support
      if (!window.AudioContext && !window.webkitAudioContext) {
        throw new Error('Web Audio API not supported in this browser');
      }

      // Create AudioContext with proper sample rate
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.config.sampleRate
      });

      // Handle browser autoplay restrictions
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
    } catch (error) {
      const audioError = new Error(`Failed to initialize AudioManager: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.handleError(audioError);
      throw audioError;
    }
  }

  /**
   * Request microphone access with comprehensive permission handling
   */
  async requestMicrophoneAccess(deviceId?: string): Promise<MediaStream> {
    try {
      await this.initialize();

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          sampleRate: { ideal: this.config.sampleRate },
          channelCount: { ideal: this.config.channels },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Set up audio processing pipeline
      await this.setupAudioProcessing();

      return this.mediaStream;
    } catch (error) {
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            throw new Error('Microphone access denied. Please allow microphone permissions.');
          case 'NotFoundError':
            throw new Error('No microphone found. Please connect a microphone.');
          case 'NotReadableError':
            throw new Error('Microphone is being used by another application.');
          case 'OverconstrainedError':
            throw new Error('Microphone does not support the requested configuration.');
          default:
            throw new Error(`Microphone access failed: ${error.message}`);
        }
      }
      throw error;
    }
  }

  /**
   * Set up the complete audio processing pipeline
   */
  private async setupAudioProcessing(): Promise<void> {
    if (!this.audioContext || !this.mediaStream) {
      throw new Error('AudioContext or MediaStream not available');
    }

    try {
      // Create source node from media stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create analyser for visualization
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      // Create processor for real-time audio data
      this.processorNode = this.audioContext.createScriptProcessor(
        this.config.bufferSize,
        this.config.channels,
        this.config.channels
      );

      // Connect the audio graph
      this.sourceNode
        .connect(this.gainNode)
        .connect(this.analyserNode)
        .connect(this.processorNode)
        .connect(this.audioContext.destination);

      // Set up audio processing callback
      this.processorNode.onaudioprocess = (event) => {
        this.processAudioData(event);
      };

      // Set up MediaRecorder for audio capture
      this.setupMediaRecorder();

    } catch (error) {
      throw new Error(`Failed to setup audio processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set up MediaRecorder for high-quality audio capture
   */
  private setupMediaRecorder(): void {
    if (!this.mediaStream) return;

    try {
      // Try to use the best available codec
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/wav',
        'audio/mp4',
        'audio/webm'
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported audio format found for recording');
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000 // High quality
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecordedAudio();
      };

    } catch (error) {
      console.warn('MediaRecorder setup failed, fallback to ScriptProcessor only:', error);
    }
  }

  /**
   * Process real-time audio data for VAD and visualization
   */
  private processAudioData(event: AudioProcessingEvent): void {
    const inputBuffer = event.inputBuffer;
    const channelData = inputBuffer.getChannelData(0);

    // Voice Activity Detection
    const isSpeechDetected = this.vad.detectSpeech(channelData);

    // Get visualization data
    const visualizationData = this.getVisualizationData(isSpeechDetected);

    // Call visualization callback
    if (this.visualizationCallback) {
      this.visualizationCallback(visualizationData);
    }

    // If recording and have callback, send PCM16 data
    if (this.isRecording && this.recordingCallback) {
      const pcm16Data = this.convertToPCM16(channelData);
      this.recordingCallback(pcm16Data.buffer as ArrayBuffer);
    }
  }

  /**
   * Convert Float32Array to PCM16 format for OpenAI API
   */
  private convertToPCM16(float32Array: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit PCM
      const clamped = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = Math.round(clamped * 32767);
    }

    return pcm16;
  }

  /**
   * Get current audio visualization data
   */
  private getVisualizationData(isSpeechDetected: boolean): AudioVisualizationData {
    if (!this.analyserNode) {
      return {
        frequencyData: new Uint8Array(0),
        timeData: new Uint8Array(0),
        rmsLevel: 0,
        isSpeechDetected: false
      };
    }

    const frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
    const timeData = new Uint8Array(this.analyserNode.frequencyBinCount);

    this.analyserNode.getByteFrequencyData(frequencyData);
    this.analyserNode.getByteTimeDomainData(timeData);

    const rmsLevel = this.vad.getCurrentLevel();

    return {
      frequencyData,
      timeData,
      rmsLevel,
      isSpeechDetected
    };
  }

  /**
   * Start audio recording
   */
  async startRecording(): Promise<void> {
    try {
      if (!this.mediaStream) {
        await this.requestMicrophoneAccess();
      }

      if (this.isRecording) {
        console.warn('Recording already in progress');
        return;
      }

      this.isRecording = true;
      this.audioChunks = [];
      this.recordingStartTime = Date.now();

      // Start MediaRecorder if available
      if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
        this.mediaRecorder.start(100); // Capture data every 100ms
      }

    } catch (error) {
      this.isRecording = false;
      const recordingError = new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.handleError(recordingError);
      throw recordingError;
    }
  }

  /**
   * Stop audio recording
   */
  stopRecording(): void {
    if (!this.isRecording) {
      console.warn('No recording in progress');
      return;
    }

    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  /**
   * Process recorded audio and prepare for transmission
   */
  private async processRecordedAudio(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    try {
      const audioBlob = new Blob(this.audioChunks, {
        type: this.mediaRecorder?.mimeType || 'audio/webm'
      });

      const arrayBuffer = await audioBlob.arrayBuffer();

      if (this.recordingCallback) {
        this.recordingCallback(arrayBuffer);
      }

    } catch (error) {
      this.handleError(new Error(`Failed to process recorded audio: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Play AI response audio
   */
  async playAudioResponse(audioData: string): Promise<void> {
    try {
      if (!this.audioContext) {
        throw new Error('AudioContext not initialized');
      }

      if (this.isPlaying) {
        console.warn('Audio already playing');
        return;
      }

      this.isPlaying = true;

      // Decode base64 audio data
      const binaryData = this.base64ToArrayBuffer(audioData);

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(binaryData);

      // Create buffer source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Create gain node for volume control
      const playbackGain = this.audioContext.createGain();
      playbackGain.gain.value = 0.8; // Slightly lower volume for AI responses

      // Connect and play
      source.connect(playbackGain).connect(this.audioContext.destination);

      source.onended = () => {
        this.isPlaying = false;
      };

      source.start();

    } catch (error) {
      this.isPlaying = false;
      const playbackError = new Error(`Failed to play audio response: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.handleError(playbackError);
      throw playbackError;
    }
  }

  /**
   * Get available audio devices
   */
  async getAudioDevices(): Promise<AudioDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `${device.kind} ${device.deviceId.substr(0, 8)}`,
          kind: device.kind as 'audioinput' | 'audiooutput'
        }));
    } catch (error) {
      throw new Error(`Failed to get audio devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set recording callback for real-time audio data
   */
  setRecordingCallback(callback: (audioData: ArrayBuffer) => void): void {
    this.recordingCallback = callback;
  }

  /**
   * Set visualization callback for real-time audio visualization
   */
  setVisualizationCallback(callback: (data: AudioVisualizationData) => void): void {
    this.visualizationCallback = callback;
  }

  /**
   * Set error callback for error handling
   */
  setErrorCallback(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Set microphone gain
   */
  setMicrophoneGain(gain: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(2, gain));
    }
  }

  /**
   * Set VAD threshold
   */
  setVADThreshold(threshold: number): void {
    this.vad.setThreshold(threshold);
  }

  /**
   * Get current audio visualization data
   */
  getAudioVisualization(): AudioVisualizationData {
    return this.getVisualizationData(false);
  }

  /**
   * Utility: Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Handle errors with callback
   */
  private handleError(error: Error): void {
    console.error('AudioManager Error:', error);
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isRecording: this.isRecording,
      isPlaying: this.isPlaying,
      hasMediaStream: !!this.mediaStream,
      audioContextState: this.audioContext?.state || 'not-created',
      sampleRate: this.audioContext?.sampleRate || 0
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Stop recording
    if (this.isRecording) {
      this.stopRecording();
    }

    // Close MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Disconnect audio nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isInitialized = false;
    this.isRecording = false;
    this.isPlaying = false;
  }
}

// Create singleton instance
export const audioManager = new AudioManager();

// Declare global types for webkit prefixes
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}