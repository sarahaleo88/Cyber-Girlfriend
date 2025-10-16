# Cyber Girlfriend - AI Voice Companion

An AI-powered voice companion application built with React, TypeScript, and Bun. Features real-time voice interactions, emotion recognition, and personalized conversations.

## Features

### Core Features
- **Real-time Voice Chat**: WebSocket-based voice communication with OpenAI Realtime API
- **AI Personality System**: Choose from 3 distinct personalities (Friendly, Professional, Playful)
- **Emotion Recognition**: AI-powered emotion detection and response
- **Conversation History**: Persistent storage with SQLite database
- **Data Export**: Export conversations in JSON, Markdown, or Text formats

### PWA Features
- **Progressive Web App**: Install on any device for native-like experience
- **Offline Support**: Continue viewing conversations without internet
- **Service Worker**: Smart caching for fast loading and offline functionality
- **Push Notifications**: Get notified of new messages (optional)

### UI/UX
- **Modern Interface**: Beautiful animations with Framer Motion and TailwindCSS
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Voice Visualizer**: Real-time audio waveform during conversations
- **Settings Panel**: Customize personality, audio, and privacy settings

### Technical
- **High Performance**: Bun runtime with Hono web framework
- **Type Safety**: Full TypeScript support throughout the stack
- **WebSocket Communication**: Real-time bidirectional communication
- **Edge Deployment**: Ready for Cloudflare Workers deployment

## Tech Stack

### Frontend
- **React 18** with TypeScript and Vite for fast development
- **TailwindCSS** for utility-first styling
- **Zustand** for lightweight state management
- **Framer Motion** for smooth animations
- **WebSocket Client** for real-time communication

### Backend
- **Bun** runtime for high-performance JavaScript/TypeScript
- **Hono** web framework for minimal overhead
- **SQLite** with Drizzle ORM for data persistence
- **WebSocket Server** for real-time communication
- **Zod** for runtime type validation

## Quick Start

### Prerequisites

- Node.js 18+ (for frontend tooling)
- Bun 1.0+ (for backend runtime)
- Git

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd cyber-girlfriend

# Run the setup script
./dev-start.sh
```

The script will:
- Install Bun if not present
- Install all dependencies
- Set up environment variables
- Run database migrations
- Start both frontend and backend servers

### Option 2: Manual Setup

```bash
# 1. Clone and navigate
git clone <repository-url>
cd cyber-girlfriend

# 2. Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# 3. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 4. Install dependencies
npm run install:all

# 5. Set up database
npm run db:migrate

# 6. Start development servers
npm run dev
```

## Development

### Available Scripts

```bash
# Development
npm run dev                 # Start both frontend and backend
npm run dev:frontend        # Start frontend only (port 3000)
npm run dev:backend         # Start backend only (port 8000)

# Building
npm run build               # Build both frontend and backend
npm run build:frontend      # Build frontend only
npm run build:backend       # Build backend only

# Code Quality
npm run lint                # Lint both frontend and backend
npm run format              # Format code with Prettier
npm run test                # Run tests

# Database
npm run db:migrate          # Run database migrations
npm run db:studio           # Open Drizzle Studio

# Utilities
npm run install:all         # Install all dependencies
npm run clean               # Clean all build outputs and dependencies
npm run setup               # Initial project setup
```

### Project Structure

```
cyber-girlfriend/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API service layer
│   │   ├── store/           # Zustand state management
│   │   ├── styles/          # CSS and styling
│   │   └── types/           # TypeScript type definitions
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
├── backend/                  # Bun + Hono backend
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic services
│   │   ├── db/              # Database schema and migrations
│   │   └── types/           # TypeScript type definitions
│   ├── data/                # SQLite database files
│   └── package.json         # Backend dependencies
├── docs/                     # Documentation
├── .env.example             # Environment variables template
├── dev-start.sh             # Development setup script
└── package.json             # Root package with unified scripts
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Application Configuration
NODE_ENV=development
PORT=8000
WS_PORT=8001

# Database
DATABASE_URL=./data/cyber-girlfriend.db

# API Keys (Optional - for production features)
OPENAI_API_KEY=your_openai_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# CORS
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### REST API (http://localhost:8000)

- `GET /health` - Health check
- `GET /ws/status` - WebSocket server status
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id/preferences` - Update user preferences
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Add message
- `POST /api/voice/synthesize` - Text-to-speech
- `POST /api/voice/transcribe` - Speech-to-text
- `GET /api/voice/voices` - Available voices

### WebSocket API (ws://localhost:8001)

Real-time communication for:
- Audio streaming
- Text messaging
- Emotion updates
- Connection status

Example WebSocket message:
```json
{
  "type": "audio",
  "data": {
    "audioData": "base64_encoded_audio",
    "format": "wav"
  },
  "timestamp": "2023-12-07T10:30:00Z"
}
```

## Development Features

### Current Implementation

#### ✅ Completed Features
- **Project Setup**: Complete development environment with React 18, TypeScript, Vite
- **UI Foundation**: TailwindCSS styling with custom cyber theme, Framer Motion animations
- **State Management**: Zustand for lightweight, efficient state handling
- **Backend Server**: Bun + Hono for high-performance API and WebSocket handling
- **Database**: SQLite + Drizzle ORM with full schema and migrations
- **Web Audio API**: Complete microphone capture, audio processing, and playback
- **Voice Button**: Animated button with state machine (idle → connecting → active)
- **Conversation Interface**: Real-time message display with typing indicators
- **AI Personality System**: 3 personality presets with dynamic prompt management
- **Data Export**: Export conversations in JSON, Markdown, and Text formats
- **PWA Implementation**: Service worker, manifest, offline support, install prompts
- **OpenAI Integration**: Realtime API proxy with WebSocket communication
- **Settings Panel**: Comprehensive settings for personality, audio, and privacy
- **Development Tooling**: ESLint, Prettier, TypeScript strict mode

### Mock Features (Development Mode)

The application includes mock implementations for development:

- **Voice Synthesis**: Returns mock audio URLs
- **Speech Recognition**: Returns sample transcriptions
- **Emotion Analysis**: Simple keyword-based emotion detection
- **AI Responses**: Predefined response templates

### Production Integration

For production deployment, integrate with:

- **OpenAI API**: For real speech-to-text, text-to-speech, and AI responses
- **DeepSeek API**: Alternative AI model for conversations
- **Cloud Storage**: For audio file storage (AWS S3, etc.)
- **Production Database**: PostgreSQL or similar
- **Authentication**: JWT-based user authentication
- **Rate Limiting**: API request limiting
- **Monitoring**: Application performance monitoring

## Troubleshooting

### Common Issues

1. **Bun installation fails**
   ```bash
   # Try manual installation
   curl -fsSL https://bun.sh/install | bash
   source ~/.bashrc  # or ~/.zshrc
   ```

2. **Port conflicts**
   ```bash
   # Check if ports are in use
   lsof -i :3000  # Frontend
   lsof -i :8000  # Backend API
   lsof -i :8001  # WebSocket
   ```

3. **Database migration errors**
   ```bash
   # Reset database
   rm -rf backend/data/
   npm run db:migrate
   ```

4. **Dependencies issues**
   ```bash
   # Clean and reinstall
   npm run clean
   npm run install:all
   ```

### Development Tips

- Use the provided ESLint and Prettier configurations for consistent code style
- Check the WebSocket status at `http://localhost:8000/ws/status`
- Monitor the console for real-time WebSocket messages
- Use Drizzle Studio for database inspection: `npm run db:studio`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting: `npm run lint && npm run test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## New Features Guide

### Using AI Personalities

1. Click the Settings icon (⚙️) in the header
2. Navigate to the "Personality" tab
3. Choose from three personalities:
   - **Friendly Companion**: Warm, supportive, empathetic
   - **Professional Assistant**: Formal, efficient, task-focused
   - **Playful Friend**: Casual, humorous, energetic
4. Click "Preview" to see a sample response
5. Your selection is saved automatically

### Exporting Conversations

1. Open Settings → Privacy tab
2. Click "Export Data"
3. Choose your format:
   - **JSON**: Structured data for importing elsewhere
   - **Markdown**: Human-readable with formatting
   - **Text**: Simple plain text
4. Select options (metadata, timestamps)
5. Click "Export" to download

### Installing as PWA

1. Use the app for a few seconds
2. An install prompt will appear
3. Click "Install" to add to your device
4. Launch from home screen/desktop
5. Enjoy offline support and faster loading

### Using Offline Mode

- Conversations are cached automatically
- View history without internet
- Messages queue when offline
- Auto-sync when connection restored

## Additional Documentation

- **[TESTING.md](./TESTING.md)**: Comprehensive testing guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Production deployment instructions
- **[GitHub Issues](https://github.com/sarahaleo88/Cyber-Girlfriend/issues)**: Feature requests and bug reports

## Support

For issues and questions:
- Check the troubleshooting section above
- Review [TESTING.md](./TESTING.md) for common issues
- Check [GitHub Issues](https://github.com/sarahaleo88/Cyber-Girlfriend/issues)
- Review the project structure and API documentation
- Ensure all prerequisites are installed correctly