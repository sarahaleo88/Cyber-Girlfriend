# Cyber Girlfriend - AI Voice Companion

An AI-powered voice companion application built with React, TypeScript, and Bun. Features real-time voice interactions, emotion recognition, and personalized conversations.

## Features

- **Real-time Voice Chat**: WebSocket-based voice communication
- **Emotion Recognition**: AI-powered emotion detection and response
- **Personalized Experience**: Customizable personality traits and voice settings
- **Modern UI**: Beautiful animations with Framer Motion and TailwindCSS
- **High Performance**: Bun runtime with Hono web framework
- **Type Safety**: Full TypeScript support throughout the stack

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

- ✅ Complete project structure
- ✅ React 18 + TypeScript frontend with Vite
- ✅ TailwindCSS styling with custom cyber theme
- ✅ Zustand state management
- ✅ Framer Motion animations
- ✅ Bun + Hono backend server
- ✅ SQLite + Drizzle ORM database
- ✅ WebSocket server for real-time communication
- ✅ Development tooling (ESLint, Prettier)
- ✅ Environment configuration
- ✅ Development scripts and automation

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

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the project structure and API documentation
- Ensure all prerequisites are installed correctly