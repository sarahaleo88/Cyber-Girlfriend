# Testing Guide - Cyber Girlfriend

This guide covers testing the Cyber Girlfriend application, including setup, test scenarios, and troubleshooting.

## Prerequisites

Before testing, ensure you have:
- ✅ Completed project setup (`npm run install:all`)
- ✅ Set up environment variables (`.env` file)
- ✅ OpenAI API key configured
- ✅ Database migrated (`npm run db:migrate`)

## Quick Start Testing

### 1. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start separately:
npm run dev:frontend  # Frontend on http://localhost:5173
npm run dev:backend   # Backend on http://localhost:8000
```

### 2. Verify Services

**Check Backend Health:**
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "0.0.1",
  "service": "cyber-girlfriend-backend"
}
```

**Check WebSocket Status:**
```bash
curl http://localhost:8000/ws/status
```

## Feature Testing

### 1. AI Personality System

**Test Personality Selection:**
1. Open the app in browser
2. Click the Settings icon (⚙️)
3. Navigate to "Personality" tab
4. Select each personality (Friendly, Professional, Playful)
5. Click "Preview" to see sample responses

**API Testing:**
```bash
# Get all personalities
curl http://localhost:8000/api/personality

# Get current personality
curl http://localhost:8000/api/personality/current

# Switch personality
curl -X POST http://localhost:8000/api/personality/switch \
  -H "Content-Type: application/json" \
  -d '{"personalityId": "playful"}'

# Get personality preview
curl http://localhost:8000/api/personality/friendly/preview
```

**Expected Behaviors:**
- ✅ Personality cards display correctly
- ✅ Trait bars animate on selection
- ✅ Preview shows personality-specific message
- ✅ Selection persists across page reloads

### 2. Data Persistence & Export

**Test Conversation Export:**
1. Have a conversation with the AI
2. Open Settings → Privacy tab
3. Click "Export Data"
4. Select format (JSON, Markdown, or Text)
5. Choose options (metadata, timestamps)
6. Click "Export"

**API Testing:**
```bash
# Export conversation as JSON
curl "http://localhost:8000/api/conversations/{id}/export?format=json&includeMetadata=true"

# Export as Markdown
curl "http://localhost:8000/api/conversations/{id}/export?format=markdown"

# Bulk export
curl -X POST http://localhost:8000/api/conversations/export/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "conversationIds": ["id1", "id2"],
    "format": "json",
    "includeMetadata": true
  }'
```

**Expected Behaviors:**
- ✅ Export dialog opens correctly
- ✅ Format selection works
- ✅ File downloads with correct format
- ✅ Exported data is complete and accurate

### 3. PWA Features

**Test Service Worker:**
1. Open DevTools → Application → Service Workers
2. Verify service worker is registered
3. Check "Offline" in Network tab
4. Reload page - should work offline
5. Uncheck "Offline" - should sync when back online

**Test Installation:**
1. Wait for install prompt (appears after 5 seconds)
2. Click "Install"
3. Verify app installs to home screen/desktop
4. Launch installed app
5. Verify standalone mode works

**Test Offline Mode:**
1. Start the app online
2. Have a conversation
3. Enable offline mode (DevTools → Network → Offline)
4. Navigate through the app
5. Verify cached content loads
6. Try to send a message (should queue)
7. Go back online
8. Verify queued messages send

**Expected Behaviors:**
- ✅ Service worker registers successfully
- ✅ Install prompt appears
- ✅ App installs correctly
- ✅ Offline mode shows cached content
- ✅ Background sync works when online

### 4. OpenAI Realtime API Integration

**Prerequisites:**
- Valid OpenAI API key in `.env`
- Microphone permissions granted

**Test Voice Conversation:**
1. Click the voice button
2. Grant microphone permission
3. Speak a message
4. Wait for AI response
5. Verify audio playback

**Test WebSocket Connection:**
```bash
# Check WebSocket status
curl http://localhost:8000/ws/status

# Check realtime sessions
curl http://localhost:8000/api/realtime/sessions

# Check metrics
curl http://localhost:8000/api/realtime/metrics
```

**Expected Behaviors:**
- ✅ Microphone access granted
- ✅ Voice button shows recording state
- ✅ Audio waveform displays during recording
- ✅ AI responds with voice
- ✅ Conversation appears in text form
- ✅ WebSocket connection stable

### 5. Voice Button States

**Test State Machine:**
1. **Idle State:**
   - Button shows microphone icon
   - No animation
   - Click to start recording

2. **Connecting State:**
   - Button shows loading spinner
   - Requesting microphone access
   - Cannot interact

3. **Active State:**
   - Button shows stop icon
   - Pulse animation
   - Recording audio
   - Click to stop

**Expected Behaviors:**
- ✅ Smooth transitions between states
- ✅ Visual feedback for each state
- ✅ Keyboard accessibility (spacebar)
- ✅ Touch/click responsiveness

### 6. Conversation Interface

**Test Message Display:**
1. Send text messages
2. Send voice messages
3. Verify message bubbles display correctly
4. Check timestamps
5. Verify auto-scroll

**Test Typing Indicator:**
1. Send a message
2. Verify typing indicator appears
3. Verify it disappears when response arrives

**Expected Behaviors:**
- ✅ Messages display in correct order
- ✅ User/AI messages styled differently
- ✅ Typing indicator animates
- ✅ Auto-scroll to latest message
- ✅ Timestamps formatted correctly

## Integration Testing

### End-to-End Conversation Flow

1. **Start Fresh:**
   - Clear browser data
   - Open app
   - Grant permissions

2. **Select Personality:**
   - Open settings
   - Choose "Playful Friend"
   - Verify selection

3. **Voice Conversation:**
   - Click voice button
   - Say: "Hello, how are you?"
   - Wait for response
   - Verify playful tone

4. **Switch Personality:**
   - Open settings
   - Switch to "Professional Assistant"
   - Continue conversation
   - Verify tone change

5. **Export Conversation:**
   - Open settings
   - Export as Markdown
   - Verify file contents

6. **Test Offline:**
   - Go offline
   - View conversation history
   - Go back online
   - Continue conversation

## Performance Testing

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 10 --num 50 http://localhost:8000/health
```

### Memory Profiling

1. Open DevTools → Performance
2. Start recording
3. Have a long conversation (20+ messages)
4. Stop recording
5. Check memory usage
6. Verify no memory leaks

**Expected Metrics:**
- Response time: < 500ms
- Memory usage: < 100MB sustained
- No memory leaks over time

## Browser Compatibility

Test on:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

## Troubleshooting

### Common Issues

**Service Worker not registering:**
```bash
# Check if running on HTTPS or localhost
# Service workers require secure context
```

**Microphone not working:**
```bash
# Check browser permissions
# Verify HTTPS (required for getUserMedia)
# Check browser console for errors
```

**WebSocket connection fails:**
```bash
# Verify backend is running
# Check CORS configuration
# Verify WebSocket port (8001)
```

**Export not working:**
```bash
# Check conversation ID is valid
# Verify backend API is accessible
# Check browser console for errors
```

## Automated Testing

### Run Unit Tests

```bash
# Frontend tests
cd frontend
npm run test

# Backend tests (if implemented)
cd backend
bun test
```

### Run E2E Tests (Future)

```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npx playwright test
```

## Test Checklist

Before considering testing complete:

**Core Features:**
- [ ] Voice recording works
- [ ] AI responds correctly
- [ ] Conversation persists
- [ ] Export functionality works
- [ ] Personality switching works

**PWA Features:**
- [ ] Service worker registers
- [ ] App can be installed
- [ ] Offline mode works
- [ ] Install prompt appears

**UI/UX:**
- [ ] Responsive on mobile
- [ ] Animations smooth
- [ ] No layout shifts
- [ ] Accessible (keyboard navigation)

**Performance:**
- [ ] Fast load time (< 3s)
- [ ] Smooth interactions
- [ ] No memory leaks
- [ ] Efficient caching

**Security:**
- [ ] HTTPS enforced
- [ ] API keys secured
- [ ] Input validation works
- [ ] CORS configured correctly

## Reporting Issues

When reporting bugs, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser/OS information
5. Console errors
6. Network logs (if applicable)

## Next Steps

After testing:
1. Document any issues found
2. Create GitHub issues for bugs
3. Update test coverage
4. Plan for automated testing
5. Prepare for production deployment

