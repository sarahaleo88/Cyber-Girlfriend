# Quick Start Guide - Cyber Girlfriend

Get up and running with Cyber Girlfriend in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Bun 1.0+ installed (or we'll install it for you)
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Installation

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/sarahaleo88/Cyber-Girlfriend.git
cd Cyber-Girlfriend

# Run the setup script
chmod +x dev-start.sh
./dev-start.sh
```

The script will:
1. Install Bun if not present
2. Install all dependencies
3. Set up environment variables
4. Run database migrations
5. Start both servers

### Option 2: Manual Setup

```bash
# 1. Clone the repository
git clone https://github.com/sarahaleo88/Cyber-Girlfriend.git
cd Cyber-Girlfriend

# 2. Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# 3. Copy environment file
cp .env.example .env

# 4. Edit .env and add your OpenAI API key
# Open .env in your editor and replace:
# OPENAI_API_KEY=your_openai_api_key_here
# with your actual API key

# 5. Install dependencies
npm run install:all

# 6. Run database migrations
npm run db:migrate

# 7. Start development servers
npm run dev
```

## Configuration

### Required: OpenAI API Key

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Open `.env` file in the project root
3. Replace `your_openai_api_key_here` with your actual key:
   ```env
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
   ```

### Optional: Other Settings

The `.env` file contains other optional settings:
- `PORT`: Backend API port (default: 8000)
- `WS_PORT`: WebSocket port (default: 8001)
- `DATABASE_URL`: SQLite database location
- `FRONTEND_URL`: Frontend URL for CORS

## First Run

### 1. Access the Application

Once the servers are running:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **WebSocket**: ws://localhost:8001

### 2. Grant Permissions

When you first open the app:
1. Click the voice button (microphone icon)
2. Your browser will ask for microphone permission
3. Click "Allow" to enable voice features

### 3. Start Talking

1. Click and hold the voice button
2. Speak your message
3. Release the button
4. Wait for the AI to respond

## Features Overview

### 🎭 Choose Your AI Personality

1. Click the Settings icon (⚙️) in the top right
2. Go to the "Personality" tab
3. Choose from:
   - **Friendly Companion**: Warm and supportive
   - **Professional Assistant**: Efficient and formal
   - **Playful Friend**: Fun and energetic

### 💾 Export Your Conversations

1. Open Settings → Privacy tab
2. Click "Export Data"
3. Choose format (JSON, Markdown, or Text)
4. Download your conversation history

### 📱 Install as App

1. Use the app for a few seconds
2. An install prompt will appear
3. Click "Install" to add to your device
4. Launch from home screen/desktop

### 🔌 Use Offline

- View past conversations without internet
- Messages queue when offline
- Auto-sync when connection restored

## Troubleshooting

### "Service worker not registering"

**Solution**: Make sure you're accessing via `localhost` or `https://`. Service workers require a secure context.

### "Microphone not working"

**Solutions**:
1. Check browser permissions (click lock icon in address bar)
2. Ensure you're using HTTPS or localhost
3. Try a different browser (Chrome/Edge recommended)
4. Check if another app is using the microphone

### "OpenAI API error"

**Solutions**:
1. Verify your API key is correct in `.env`
2. Check you have credits in your OpenAI account
3. Ensure you have access to the Realtime API
4. Restart the backend server after changing `.env`

### "Port already in use"

**Solutions**:
```bash
# Find and kill process using port 5173 (frontend)
lsof -ti:5173 | xargs kill -9

# Find and kill process using port 8000 (backend)
lsof -ti:8000 | xargs kill -9

# Or change ports in .env file
```

### "Database migration failed"

**Solution**:
```bash
# Reset database
rm -rf backend/data/
npm run db:migrate
```

## Development Commands

```bash
# Start both frontend and backend
npm run dev

# Start only frontend (port 5173)
npm run dev:frontend

# Start only backend (port 8000)
npm run dev:backend

# Build for production
npm run build

# Run linting
npm run lint

# Format code
npm run format

# Run tests
npm run test

# Database management
npm run db:migrate    # Run migrations
npm run db:studio     # Open database GUI
```

## Project Structure

```
cyber-girlfriend/
├── frontend/          # React TypeScript frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── services/      # API and audio services
│   │   ├── store/         # State management
│   │   └── styles/        # CSS styles
│   └── public/            # Static assets
├── backend/           # Bun + Hono backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── db/            # Database schema
│   │   └── types/         # TypeScript types
│   └── data/              # SQLite database
└── docs/              # Documentation
```

## API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Get Personalities
```bash
curl http://localhost:8000/api/personality
```

### Switch Personality
```bash
curl -X POST http://localhost:8000/api/personality/switch \
  -H "Content-Type: application/json" \
  -d '{"personalityId": "playful"}'
```

### Export Conversation
```bash
curl "http://localhost:8000/api/conversations/{id}/export?format=markdown"
```

## Next Steps

### For Users
1. ✅ Start a conversation
2. ✅ Try different personalities
3. ✅ Export your conversations
4. ✅ Install as PWA
5. ✅ Explore settings

### For Developers
1. 📖 Read [TESTING.md](./TESTING.md) for testing guide
2. 🚀 Read [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment
3. 📝 Check [PROJECT_COMPLETION_SUMMARY.md](./PROJECT_COMPLETION_SUMMARY.md) for features
4. 🐛 Report issues on [GitHub](https://github.com/sarahaleo88/Cyber-Girlfriend/issues)

## Getting Help

- **Documentation**: Check README.md, TESTING.md, DEPLOYMENT.md
- **Issues**: [GitHub Issues](https://github.com/sarahaleo88/Cyber-Girlfriend/issues)
- **Logs**: Check browser console (F12) and terminal output

## Tips for Best Experience

1. **Use headphones** to prevent echo
2. **Speak clearly** for better recognition
3. **Try different personalities** to find your favorite
4. **Export regularly** to save your conversations
5. **Install as PWA** for faster access

## Security Notes

- Your conversations are stored locally
- API keys are never exposed to the frontend
- All data stays on your device unless you export it
- HTTPS is required for production use

## Performance Tips

- Close other tabs using microphone
- Use Chrome/Edge for best performance
- Clear cache if app feels slow
- Check internet connection for voice features

---

**Ready to start?** Just run `npm run dev` and open http://localhost:5173!

**Need help?** Check the troubleshooting section above or open an issue on GitHub.

**Enjoying the app?** Star the repo and share with friends! ⭐

