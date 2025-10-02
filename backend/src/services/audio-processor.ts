/**
 * Audio processing utilities for OpenAI Realtime API
 * Handles PCM16 format conversion and audio stream processing
 */

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

export interface AudioBuffer {
  data: Float32Array;
  sampleRate: number;
  channels: number;
}

export class AudioProcessor {
  private static readonly DEFAULT_SAMPLE_RATE = 24000; // OpenAI Realtime API uses 24kHz
  private static readonly DEFAULT_CHANNELS = 1; // Mono
  private static readonly DEFAULT_BITS_PER_SAMPLE = 16; // PCM16

  /**
   * Convert Float32Array audio data to PCM16 base64 string
   */
  public static float32ToPCM16Base64(audioData: Float32Array): string {
    const pcm16Data = this.float32ToPCM16(audioData);
    return Buffer.from(pcm16Data.buffer).toString('base64');
  }

  /**
   * Convert PCM16 base64 string to Float32Array audio data
   */
  public static pcm16Base64ToFloat32(base64Data: string): Float32Array {
    const buffer = Buffer.from(base64Data, 'base64');
    const pcm16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    return this.pcm16ToFloat32(pcm16Array);
  }

  /**
   * Convert Float32Array to PCM16 (Int16Array)
   */
  public static float32ToPCM16(float32Array: Float32Array): Int16Array {
    const pcm16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp the value to [-1, 1] range
      let sample = Math.max(-1, Math.min(1, float32Array[i]));

      // Convert to 16-bit signed integer
      pcm16Array[i] = Math.round(sample * 32767);
    }

    return pcm16Array;
  }

  /**
   * Convert PCM16 (Int16Array) to Float32Array
   */
  public static pcm16ToFloat32(pcm16Array: Int16Array): Float32Array {
    const float32Array = new Float32Array(pcm16Array.length);

    for (let i = 0; i < pcm16Array.length; i++) {
      // Convert from 16-bit signed integer to float [-1, 1]
      float32Array[i] = pcm16Array[i] / 32768.0;
    }

    return float32Array;
  }

  /**
   * Resample audio data to target sample rate
   */
  public static resample(
    audioData: Float32Array,
    sourceSampleRate: number,
    targetSampleRate: number
  ): Float32Array {
    if (sourceSampleRate === targetSampleRate) {
      return audioData;
    }

    const ratio = sourceSampleRate / targetSampleRate;
    const outputLength = Math.round(audioData.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i * ratio;
      const sourceIndexFloor = Math.floor(sourceIndex);
      const sourceIndexCeil = Math.min(sourceIndexFloor + 1, audioData.length - 1);
      const fraction = sourceIndex - sourceIndexFloor;

      // Linear interpolation
      output[i] = audioData[sourceIndexFloor] * (1 - fraction) +
                  audioData[sourceIndexCeil] * fraction;
    }

    return output;
  }

  /**
   * Convert stereo audio to mono by averaging channels
   */
  public static stereoToMono(stereoData: Float32Array): Float32Array {
    const monoLength = stereoData.length / 2;
    const monoData = new Float32Array(monoLength);

    for (let i = 0; i < monoLength; i++) {
      const leftChannel = stereoData[i * 2];
      const rightChannel = stereoData[i * 2 + 1];
      monoData[i] = (leftChannel + rightChannel) / 2;
    }

    return monoData;
  }

  /**
   * Convert mono audio to stereo by duplicating the channel
   */
  public static monoToStereo(monoData: Float32Array): Float32Array {
    const stereoData = new Float32Array(monoData.length * 2);

    for (let i = 0; i < monoData.length; i++) {
      stereoData[i * 2] = monoData[i];     // Left channel
      stereoData[i * 2 + 1] = monoData[i]; // Right channel
    }

    return stereoData;
  }

  /**
   * Apply simple gain/volume adjustment
   */
  public static applyGain(audioData: Float32Array, gain: number): Float32Array {
    const output = new Float32Array(audioData.length);

    for (let i = 0; i < audioData.length; i++) {
      output[i] = Math.max(-1, Math.min(1, audioData[i] * gain));
    }

    return output;
  }

  /**
   * Detect silence in audio data
   */
  public static detectSilence(
    audioData: Float32Array,
    threshold: number = 0.01,
    minSilenceDuration: number = 0.5,
    sampleRate: number = 24000
  ): { isSilent: boolean; silenceDuration: number } {
    const minSilenceSamples = Math.floor(minSilenceDuration * sampleRate);
    let silentSamples = 0;
    let consecutiveSilentSamples = 0;

    for (let i = 0; i < audioData.length; i++) {
      if (Math.abs(audioData[i]) < threshold) {
        silentSamples++;
        consecutiveSilentSamples++;
      } else {
        consecutiveSilentSamples = 0;
      }
    }

    const totalSilenceDuration = silentSamples / sampleRate;
    const isSilent = consecutiveSilentSamples >= minSilenceSamples;

    return {
      isSilent,
      silenceDuration: totalSilenceDuration,
    };
  }

  /**
   * Apply a simple noise gate to remove low-level noise
   */
  public static applyNoiseGate(
    audioData: Float32Array,
    threshold: number = 0.005,
    ratio: number = 0.1
  ): Float32Array {
    const output = new Float32Array(audioData.length);

    for (let i = 0; i < audioData.length; i++) {
      const sample = audioData[i];
      const amplitude = Math.abs(sample);

      if (amplitude < threshold) {
        // Apply noise gate reduction
        output[i] = sample * ratio;
      } else {
        output[i] = sample;
      }
    }

    return output;
  }

  /**
   * Normalize audio data to peak amplitude
   */
  public static normalize(audioData: Float32Array, targetPeak: number = 0.95): Float32Array {
    let maxAmplitude = 0;

    // Find peak amplitude
    for (let i = 0; i < audioData.length; i++) {
      maxAmplitude = Math.max(maxAmplitude, Math.abs(audioData[i]));
    }

    if (maxAmplitude === 0) {
      return audioData; // Silence
    }

    const gain = targetPeak / maxAmplitude;
    return this.applyGain(audioData, gain);
  }

  /**
   * Process audio for OpenAI Realtime API
   * Ensures the audio is in the correct format: PCM16, 24kHz, mono
   */
  public static processForOpenAI(
    audioData: Float32Array,
    sourceSampleRate: number,
    sourceChannels: number = 1
  ): string {
    let processedAudio = audioData;

    // Convert to mono if stereo
    if (sourceChannels === 2) {
      processedAudio = this.stereoToMono(processedAudio);
    }

    // Resample to 24kHz if needed
    if (sourceSampleRate !== this.DEFAULT_SAMPLE_RATE) {
      processedAudio = this.resample(
        processedAudio,
        sourceSampleRate,
        this.DEFAULT_SAMPLE_RATE
      );
    }

    // Apply noise gate and normalization
    processedAudio = this.applyNoiseGate(processedAudio, 0.005);
    processedAudio = this.normalize(processedAudio, 0.9);

    // Convert to PCM16 base64
    return this.float32ToPCM16Base64(processedAudio);
  }

  /**
   * Process audio from OpenAI Realtime API for playback
   * Converts from PCM16 base64 to Float32Array
   */
  public static processFromOpenAI(
    base64Audio: string,
    targetSampleRate?: number,
    targetChannels: number = 1
  ): Float32Array {
    let audioData = this.pcm16Base64ToFloat32(base64Audio);

    // Resample if target sample rate is different
    if (targetSampleRate && targetSampleRate !== this.DEFAULT_SAMPLE_RATE) {
      audioData = this.resample(audioData, this.DEFAULT_SAMPLE_RATE, targetSampleRate);
    }

    // Convert to stereo if needed
    if (targetChannels === 2) {
      audioData = this.monoToStereo(audioData);
    }

    return audioData;
  }

  /**
   * Create audio chunks for streaming
   */
  public static createChunks(
    audioData: Float32Array,
    chunkSizeMs: number = 100,
    sampleRate: number = 24000
  ): Float32Array[] {
    const samplesPerChunk = Math.floor((chunkSizeMs / 1000) * sampleRate);
    const chunks: Float32Array[] = [];

    for (let i = 0; i < audioData.length; i += samplesPerChunk) {
      const chunkEnd = Math.min(i + samplesPerChunk, audioData.length);
      const chunk = audioData.slice(i, chunkEnd);
      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Calculate audio duration in seconds
   */
  public static calculateDuration(audioData: Float32Array, sampleRate: number): number {
    return audioData.length / sampleRate;
  }

  /**
   * Calculate RMS (Root Mean Square) volume level
   */
  public static calculateRMS(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  /**
   * Validate audio data format
   */
  public static validateAudioData(audioData: any): audioData is Float32Array {
    return audioData instanceof Float32Array && audioData.length > 0;
  }

  /**
   * Get default audio configuration for OpenAI Realtime API
   */
  public static getDefaultConfig(): AudioConfig {
    return {
      sampleRate: this.DEFAULT_SAMPLE_RATE,
      channels: this.DEFAULT_CHANNELS,
      bitsPerSample: this.DEFAULT_BITS_PER_SAMPLE,
    };
  }
}