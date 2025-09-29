# OpenAI Realtime API Integration

This implementation provides a complete WebSocket proxy server that connects to OpenAI's Realtime API for real-time voice conversations.

## 🎯 Features Implemented

### Core WebSocket Proxy Server
- ✅ Bidirectional OpenAI Realtime API connection
- ✅ Client WebSocket ↔ Server ↔ OpenAI Realtime API
- ✅ Session lifecycle management (create, maintain, close)
- ✅ Authentication and API key handling

### Audio Pipeline Implementation
- ✅ Browser MediaStream → PCM16 → Base64 → OpenAI
- ✅ OpenAI response → Audio playback for browser
- ✅ Real-time audio format conversion
- ✅ Audio streaming with proper buffering

### Error Recovery & Reliability
- ✅ Automatic reconnection with exponential backoff
- ✅ Circuit breaker pattern for API failures
- ✅ Rate limiting and connection throttling
- ✅ Graceful handling of network interruptions

## 🚀 Quick Start

### Prerequisites
```bash
# Install Bun (recommended) or Node.js
curl -fsSL https://bun.sh/install | bash

# Set OpenAI API key
export OPENAI_API_KEY=your_openai_api_key_here
```

### Installation
```bash
cd backend
bun install
# or: npm install
```

### Development
```bash
# Start the server
bun run dev
# or: npm run dev

# The server will start on:
# - HTTP API: http://localhost:8000
# - WebSocket: ws://localhost:8001
```

### Testing
```bash
# Run the test suite
node test-realtime.js

# Test individual endpoints
curl http://localhost:8000/health
curl http://localhost:8000/ws/status
curl http://localhost:8000/api/realtime/metrics
```

## 🔧 API Configuration

### Environment Variables
```bash
# Required for production
OPENAI_API_KEY=your_openai_api_key_here

# Optional configuration
NODE_ENV=development
PORT=8000
WS_PORT=8001
DATABASE_URL=./data/cyber-girlfriend.db
```

### OpenAI Realtime API Settings
- **Model**: `gpt-4o-realtime-preview-2024-10-01`
- **Audio Format**: PCM16, 24kHz, mono
- **Turn Detection**: Server-side Voice Activity Detection
- **Voice Options**: alloy, echo, fable, nova, shimmer

## 📡 WebSocket API

### Client Connection Flow
```javascript
// 1. Connect to WebSocket
const ws = new WebSocket('ws://localhost:8001');

// 2. Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  data: {
    userId: 'user-123',
    conversationId: 'conv-456'
  }
}));

// 3. Start realtime session
ws.send(JSON.stringify({
  type: 'start_realtime',
  data: {
    personalityTraits: {
      playfulness: 70,
      empathy: 80,
      humor: 60,
      intelligence: 75,
      supportiveness: 85
    },
    voiceSettings: {
      voice: 'nova',
      speed: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  }
}));

// 4. Send audio data
ws.send(JSON.stringify({
  type: 'audio',
  data: {
    audio: base64AudioData // PCM16 base64 encoded
  }
}));

// 5. Send text messages
ws.send(JSON.stringify({
  type: 'text',
  data: {
    text: 'Hello, how are you?'
  }
}));
```

### Server Events
```javascript
// Session ready
{
  type: 'session_ready',
  data: {
    sessionId: 'session-123',
    model: 'gpt-4o-realtime-preview-2024-10-01',
    voice: 'nova'
  }
}

// Speech detection
{
  type: 'speech_started',
  data: {
    itemId: 'item-123',
    audioStartMs: 1234567890
  }
}

// Audio response (streaming)
{
  type: 'audio_delta',
  data: {
    responseId: 'resp-123',
    itemId: 'item-456',
    audioData: base64AudioData
  }
}

// Text transcription
{
  type: 'transcription',
  data: {
    itemId: 'item-123',
    transcript: 'Hello there!'
  }
}

// Response complete
{
  type: 'response_complete',
  data: {
    responseId: 'resp-123',
    status: 'completed',
    usage: { total_tokens: 150 }
  }
}
```

## 🎵 Audio Processing

### Input Audio Requirements
- **Format**: PCM16 (16-bit signed integers)
- **Sample Rate**: 24kHz (preferred) or auto-resampled
- **Channels**: Mono (stereo will be converted)
- **Encoding**: Base64 string

### Audio Utilities
```typescript
import { AudioProcessor } from './services/audio-processor';

// Convert browser audio to OpenAI format
const openaiAudio = AudioProcessor.processForOpenAI(
  audioData,      // Float32Array
  48000,          // source sample rate
  2               // source channels (stereo)
);

// Convert OpenAI audio for playback
const playbackAudio = AudioProcessor.processFromOpenAI(
  base64Audio,    // base64 string from OpenAI
  48000,          // target sample rate
  2               // target channels (stereo)
);
```

## 🔄 Session Management

### Session Lifecycle
1. **Creation**: Client connects and authenticates
2. **Initialization**: OpenAI Realtime API connection established
3. **Active**: Real-time audio/text streaming
4. **Cleanup**: Graceful shutdown on disconnect

### Session Limits
- **Per User**: Maximum 3 concurrent sessions
- **Rate Limiting**: 100 requests per minute per client
- **Session Timeout**: 10 minutes of inactivity
- **Circuit Breaker**: Opens after 3 consecutive failures

## 🛠 Monitoring & Debugging

### Health Check Endpoints
```bash
# Server health
GET http://localhost:8000/health

# WebSocket and realtime status
GET http://localhost:8000/ws/status

# All active sessions
GET http://localhost:8000/api/realtime/sessions

# Specific session info
GET http://localhost:8000/api/realtime/sessions/{clientId}

# Performance metrics
GET http://localhost:8000/api/realtime/metrics
```

### Metrics Available
- Active sessions count
- Total sessions created
- Average session duration
- Error rate
- Audio processing statistics

## 🚨 Error Handling

### Common Error Types
```javascript
// Rate limit exceeded
{
  type: 'error',
  data: { error: 'Rate limit exceeded. Please try again later.' }
}

// OpenAI API connection failed
{
  type: 'error',
  data: { error: 'Failed to connect to OpenAI Realtime API' }
}

// Circuit breaker open
{
  type: 'error',
  data: { error: 'Service temporarily unavailable' }
}
```

### Reconnection Strategy
- **Initial delay**: 1 second
- **Max delay**: 30 seconds
- **Backoff factor**: 2x
- **Max attempts**: 5

## 🔧 Integration with Frontend

### React/JavaScript Example
```typescript
class RealtimeVoiceChat {
  private ws: WebSocket;
  private audioContext: AudioContext;
  private mediaStream: MediaStream;

  async connect() {
    this.ws = new WebSocket('ws://localhost:8001');

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleServerMessage(message);
    };

    // Authenticate
    this.ws.send(JSON.stringify({
      type: 'auth',
      data: { userId: this.userId, conversationId: this.conversationId }
    }));
  }

  async startVoiceChat() {
    // Get microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 24000, channelCount: 1 }
    });

    // Start realtime session
    this.ws.send(JSON.stringify({
      type: 'start_realtime',
      data: { /* personality and voice settings */ }
    }));

    // Process audio stream
    this.processAudioStream();
  }

  private processAudioStream() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      const audioData = event.inputBuffer.getChannelData(0);
      const base64Audio = AudioProcessor.float32ToPCM16Base64(audioData);

      this.ws.send(JSON.stringify({
        type: 'audio',
        data: { audio: base64Audio }
      }));
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }
}
```

## 📚 Architecture Overview

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Client App    │ ←─────────────→ │  Proxy Server   │ ←─────────────→ │  OpenAI API     │
│                 │                 │                 │                 │                 │
│ • React/JS      │                 │ • Hono/Bun      │                 │ • Realtime API  │
│ • WebSocket     │                 │ • Session Mgmt  │                 │ • GPT-4o        │
│ • MediaStream   │                 │ • Audio Pipeline│                 │ • Voice Synth   │
│ • AudioContext  │                 │ • Error Recovery│                 │ • STT/TTS       │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
        │                                     │
        │                                     │
        ▼                                     ▼
┌─────────────────┐                 ┌─────────────────┐
│   UI Layer      │                 │   Data Layer    │
│                 │                 │                 │
│ • Voice Chat    │                 │ • SQLite DB     │
│ • Personality   │                 │ • Conversations │
│ • Emotions      │                 │ • User Settings │
│ • History       │                 │ • Audio Logs    │
└─────────────────┘                 └─────────────────┘
```

## 🎯 Success Criteria ✅

All implementation goals have been achieved:

- ✅ WebSocket server handles client connections
- ✅ OpenAI Realtime API integration working end-to-end
- ✅ Audio streaming in both directions (user → AI → user)
- ✅ Session management with proper cleanup
- ✅ Error handling covers network failures and API errors
- ✅ Reconnection logic tested and working
- ✅ API rate limiting implemented
- ✅ Circuit breaker pattern for reliability
- ✅ Comprehensive audio processing pipeline
- ✅ Monitoring and metrics endpoints
- ✅ Full test suite

## 🚀 Next Steps

This implementation provides the foundation for Tasks #7 and #8:
- **Task #7**: Voice Chat UI Components (can now integrate with this WebSocket API)
- **Task #8**: Personality System Integration (personality traits are already supported)

The WebSocket proxy server is production-ready and provides all the necessary features for real-time voice conversations with the AI companion.