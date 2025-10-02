# Web Audio API Implementation

## Overview

This document describes the comprehensive Web Audio API integration for the Cyber Girlfriend AI voice companion. The implementation provides microphone input capture, real-time audio processing, voice activity detection, and audio playback functionality.

## Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   VoiceButton   │────│   AudioManager   │────│   Web Audio API     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ VoiceVisualizer │    │ VoiceActivityDet │    │  MediaStream API    │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ AudioSettings   │────│   Zustand Store  │────│   React Hooks       │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## File Structure

```
src/
├── services/
│   └── audioManager.ts          # Core Web Audio API management
├── hooks/
│   └── useAudio.ts              # React integration hook
├── components/
│   ├── VoiceButton.tsx          # Main voice interaction button
│   ├── VoiceVisualizer.tsx      # Real-time audio visualization
│   └── AudioSettings.tsx       # Device and settings configuration
├── store/
│   └── appStore.ts              # Extended Zustand store with audio state
├── types/
│   └── index.ts                 # Extended TypeScript interfaces
├── tests/
│   └── AudioIntegrationTest.tsx # Comprehensive testing component
└── docs/
    └── WebAudioAPI-Implementation.md # This documentation
```

## Core Features

### 1. Microphone Capture System

**File**: `services/audioManager.ts`

- **getUserMedia()** integration with comprehensive permission handling
- Real-time audio capture with proper buffering
- PCM16 format conversion from Float32 for OpenAI Realtime API compatibility
- Audio device selection and configuration
- Error handling for permission denied, device not found, and device busy scenarios

**Key Methods**:
```typescript
async requestMicrophoneAccess(deviceId?: string): Promise<MediaStream>
async startRecording(): Promise<void>
stopRecording(): void
```

**Configuration**:
- Sample Rate: 24,000 Hz (OpenAI requirement)
- Channels: Mono (1 channel)
- Bit Depth: 16-bit PCM
- Buffer Size: 2048 samples for low latency

### 2. Audio Processing Pipeline

**Components**:
- **ScriptProcessorNode**: Real-time audio processing
- **AnalyserNode**: Frequency and time-domain analysis
- **GainNode**: Microphone gain control
- **MediaStreamAudioSourceNode**: Audio input source

**Processing Flow**:
```
MediaStream → Source → Gain → Analyser → Processor → Destination
                ↓       ↓       ↓         ↓
             Volume   Visual   VAD    PCM16 Output
```

### 3. Voice Activity Detection (VAD)

**File**: `services/audioManager.ts` - `VoiceActivityDetector` class

**Features**:
- Real-time RMS level calculation
- Adaptive threshold based on noise floor
- Speech timeout handling (500ms)
- Rolling history for noise floor estimation

**Algorithm**:
```typescript
1. Calculate RMS level from audio samples
2. Convert amplitude to decibel scale
3. Apply adaptive threshold with noise gate
4. Maintain speech timeout for continuous detection
```

### 4. Audio Playback System

**Features**:
- Base64 audio decoding
- Low-latency playback with minimal buffering
- AudioContext-based playback for precise control
- Volume control for AI responses
- Cross-browser compatibility

**Method**:
```typescript
async playAudioResponse(audioData: string): Promise<void>
```

### 5. Real-time Audio Visualization

**File**: `components/VoiceVisualizer.tsx`

**Visualization Types**:
- **Frequency Domain**: Real-time frequency spectrum bars
- **Time Domain**: Waveform visualization
- **RMS Level**: Simple volume-based visualization

**Visual Indicators**:
- Green bars: Speech detected while recording
- Red bars: Recording but no speech detected
- Blue/Cyan bars: Audio playback
- Gray bars: Idle state

**Features**:
- Configurable bar count (default: 12-16)
- Real-time data resampling
- Speech detection indicator
- RMS level display

### 6. Device Configuration

**File**: `components/AudioSettings.tsx`

**Features**:
- Audio device enumeration and selection
- Microphone and speaker configuration
- Microphone gain control (0.1x - 2.0x)
- VAD threshold adjustment (-60dB to 0dB)
- Real-time audio level monitoring
- Device refresh capability

## React Integration

### Custom Hook: `useAudio`

**File**: `hooks/useAudio.ts`

**API**:
```typescript
interface UseAudioReturn {
  // State
  isPermissionGranted: boolean;
  isInitialized: boolean;
  isRecording: boolean;
  isPlaying: boolean;

  // Actions
  requestPermission: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  playAudio: (audioData: string) => Promise<void>;
  getDevices: () => Promise<AudioDevice[]>;
  selectMicrophone: (deviceId: string) => Promise<void>;
  setMicrophoneGain: (gain: number) => void;
  setVADThreshold: (threshold: number) => void;

  // Status
  status: any;
  error: Error | null;
}
```

### State Management

**File**: `store/appStore.ts`

**Extended Zustand Store**:
```typescript
interface AudioState {
  audioPermissionGranted: boolean;
  audioInitialized: boolean;
  microphoneLevel: number;
  speechDetected: boolean;
  availableAudioDevices: AudioDevice[];
}

interface AudioActions {
  setAudioPermissionGranted: (granted: boolean) => void;
  setAudioInitialized: (initialized: boolean) => void;
  setMicrophoneLevel: (level: number) => void;
  setSpeechDetected: (detected: boolean) => void;
  setAvailableAudioDevices: (devices: AudioDevice[]) => void;
}
```

## Components

### VoiceButton

**File**: `components/VoiceButton.tsx`

**Features**:
- Press-and-hold recording interaction
- Quick press for settings
- Visual state indicators (idle, recording, playing, error)
- Size variants (small, medium, large)
- Real-time status tooltips
- Error display

**Usage**:
```typescript
<VoiceButton
  size="large"
  onAudioData={(audioData) => handleAudioData(audioData)}
  onTranscriptReceived={(transcript) => handleTranscript(transcript)}
/>
```

### VoiceVisualizer

**File**: `components/VoiceVisualizer.tsx`

**Features**:
- Real-time audio visualization
- Configurable visualization modes
- Speech detection indicators
- RMS level display
- Smooth animations with Framer Motion

**Usage**:
```typescript
<VoiceVisualizer
  className="w-32"
  showFrequencyBars={true}
  showTimeDomain={false}
  barCount={16}
/>
```

### AudioSettings

**File**: `components/AudioSettings.tsx`

**Features**:
- Modal-based settings interface
- Device selection dropdowns
- Slider controls for gain and VAD threshold
- Real-time level monitoring
- Permission status display

## Browser Compatibility

### Supported Browsers
- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support (iOS 14.3+)
- **Edge**: Full support

### Requirements
- **HTTPS**: Required for microphone access
- **Web Audio API**: Modern browser support
- **MediaDevices API**: For device enumeration
- **AudioContext**: For audio processing

### Graceful Degradation
- Fallback to basic recording if advanced features unavailable
- Error messaging for unsupported browsers
- Progressive enhancement approach

## Performance Considerations

### Optimization Features
- **Low-latency processing**: 2048 sample buffer size
- **Efficient resampling**: Custom audio data resampling
- **Memory management**: Proper cleanup and disposal
- **CPU usage**: Optimized processing algorithms

### Monitoring
- Real-time performance metrics in AudioManager.getStatus()
- Error tracking and logging
- Resource cleanup on component unmount

## Error Handling

### Permission Errors
- **NotAllowedError**: User denied microphone access
- **NotFoundError**: No microphone available
- **NotReadableError**: Microphone in use by another application
- **OverconstrainedError**: Requested configuration not supported

### Audio Processing Errors
- AudioContext creation failures
- MediaRecorder initialization errors
- Audio playback failures
- Device selection errors

## Testing

### Integration Testing

**File**: `tests/AudioIntegrationTest.tsx`

**Test Coverage**:
- Microphone permission flow
- Device enumeration
- Recording start/stop
- Audio playback
- Gain and VAD control
- Error scenarios

**Usage**:
```typescript
import AudioIntegrationTest from './tests/AudioIntegrationTest';

// Add to your development routes
<Route path="/audio-test" component={AudioIntegrationTest} />
```

### Test Commands
```bash
# Run the test component in development
npm run dev
# Navigate to /audio-test

# Run specific audio tests
npm test -- --testNamePattern="Audio"
```

## Configuration Options

### AudioManager Configuration
```typescript
interface AudioConfig {
  sampleRate: number;      // Default: 24000
  channels: number;        // Default: 1 (mono)
  bufferSize: number;      // Default: 2048
  vadThreshold: number;    // Default: -40 (dB)
}
```

### User Preferences
```typescript
interface VoiceSettings {
  pitch: number;             // 0.5 - 2.0
  speed: number;             // 0.5 - 2.0
  voice: VoiceType;          // alloy, echo, fable, nova, shimmer
  volume: number;            // 0.0 - 1.0
  microphoneGain: number;    // 0.0 - 2.0
  vadThreshold: number;      // -60 to 0 dB
  selectedMicrophone?: string;
  selectedSpeaker?: string;
}
```

## Security Considerations

### Privacy
- No audio data stored locally
- Real-time processing only
- User-controlled recording sessions
- Clear permission indicators

### Data Handling
- PCM16 format for OpenAI API compatibility
- Base64 encoding for audio transmission
- Secure audio data transfer
- Proper memory cleanup

## Future Enhancements

### Planned Features
1. **Echo Cancellation**: Advanced acoustic processing
2. **Noise Suppression**: ML-based noise reduction
3. **Audio Effects**: Real-time voice effects
4. **Multi-channel Support**: Stereo recording options
5. **Advanced VAD**: ML-based voice activity detection
6. **Audio Compression**: Efficient data transmission
7. **Offline Mode**: Local audio processing capabilities

### Integration Points
- WebSocket connection for real-time audio streaming
- OpenAI Realtime API integration
- Audio file export functionality
- Voice command recognition

## Troubleshooting

### Common Issues

1. **Microphone not working**
   - Check browser permissions
   - Verify HTTPS connection
   - Test with different browsers
   - Check device drivers

2. **Audio quality issues**
   - Adjust microphone gain
   - Check VAD threshold
   - Verify sample rate settings
   - Test different audio devices

3. **Performance problems**
   - Reduce buffer size
   - Lower visualization bar count
   - Check CPU usage
   - Close other audio applications

4. **Playback issues**
   - Verify audio format compatibility
   - Check speaker selection
   - Test volume levels
   - Verify AudioContext state

### Debug Commands
```typescript
// Get audio system status
console.log(audioManager.getStatus());

// Test device enumeration
audioManager.getAudioDevices().then(console.log);

// Monitor audio levels
audioManager.setVisualizationCallback(console.log);
```

## Conclusion

This Web Audio API implementation provides a comprehensive, production-ready audio system for the Cyber Girlfriend AI voice companion. It offers high-quality audio capture, real-time processing, intuitive user interfaces, and robust error handling across all modern browsers.

The modular architecture allows for easy extension and maintenance, while the React integration provides a seamless developer experience. Performance optimizations ensure low-latency operation suitable for real-time voice interactions.

For questions or support, refer to the test component for interactive debugging and verification of all audio features.