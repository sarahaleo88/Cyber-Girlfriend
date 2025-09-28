import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { serve } from 'bun'
import dotenv from 'dotenv'

// Import routes
import conversationRoutes from './routes/conversations'
import voiceRoutes from './routes/voice'
import userRoutes from './routes/users'

// Import services
import { VoiceWebSocketManager } from './services/websocket'
import { initializeDatabase } from './db'

// Load environment variables
dotenv.config()

// Initialize database
try {
  initializeDatabase()
} catch (error) {
  console.error('Failed to initialize database:', error)
  process.exit(1)
}

// Initialize WebSocket server
const wsManager = new VoiceWebSocketManager(8001)

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}))

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.0.1',
    service: 'cyber-girlfriend-backend'
  })
})

// WebSocket status endpoint
app.get('/ws/status', (c) => {
  const clientInfo = wsManager.getConnectedClients()
  return c.json({
    websocket: {
      status: 'active',
      ...clientInfo,
    },
    timestamp: new Date().toISOString(),
  })
})

// API routes
app.route('/api/conversations', conversationRoutes)
app.route('/api/voice', voiceRoutes)
app.route('/api/users', userRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  }, 500)
})

const port = process.env.PORT || 8000

console.log(`🚀 Server starting on port ${port}`)

export default {
  port,
  fetch: app.fetch,
}