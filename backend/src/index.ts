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
import analyticsRoutes from './routes/analytics'

// Import services
import { VoiceWebSocketManager } from './services/websocket'
import { initializeDatabase } from './db'
import { backgroundTasks } from './services/background-tasks'

// Load environment variables
dotenv.config()

// Initialize database
try {
  initializeDatabase()
} catch (error) {
  console.error('Failed to initialize database:', error)
  process.exit(1)
}

// Initialize services
const wsManager = new VoiceWebSocketManager(8001)
backgroundTasks.start()

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

// System status endpoint
app.get('/api/system/status', (c) => {
  const backgroundTasksStatus = backgroundTasks.getServiceStatus()
  const cacheStats = backgroundTasks.getCacheStatistics()
  const clientInfo = wsManager.getConnectedClients()

  return c.json({
    success: true,
    data: {
      server: {
        status: 'healthy',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        version: '0.0.1'
      },
      backgroundTasks: backgroundTasksStatus,
      cache: cacheStats,
      websocket: {
        status: 'active',
        ...clientInfo
      },
      database: {
        status: 'connected',
        type: 'SQLite'
      }
    },
    timestamp: new Date()
  })
})

// WebSocket status endpoint
app.get('/ws/status', (c) => {
  const clientInfo = wsManager.getConnectedClients()
  const realtimeMetrics = wsManager.getRealtimeMetrics()
  return c.json({
    websocket: {
      status: 'active',
      ...clientInfo,
    },
    realtime: {
      metrics: realtimeMetrics,
    },
    timestamp: new Date().toISOString(),
  })
})

// Realtime session management endpoints
app.get('/api/realtime/sessions', (c) => {
  const sessions = wsManager.getAllRealtimeSessions()
  return c.json({
    success: true,
    data: { sessions },
    timestamp: new Date(),
  })
})

app.get('/api/realtime/sessions/:clientId', (c) => {
  const clientId = c.req.param('clientId')
  const sessionInfo = wsManager.getRealtimeSessionInfo(clientId)

  if (!sessionInfo) {
    return c.json({
      success: false,
      error: 'Session not found',
      timestamp: new Date(),
    }, 404)
  }

  return c.json({
    success: true,
    data: sessionInfo,
    timestamp: new Date(),
  })
})

app.get('/api/realtime/metrics', (c) => {
  const metrics = wsManager.getRealtimeMetrics()
  return c.json({
    success: true,
    data: metrics,
    timestamp: new Date(),
  })
})

// API routes
app.route('/api/conversations', conversationRoutes)
app.route('/api/voice', voiceRoutes)
app.route('/api/users', userRoutes)
app.route('/api/analytics', analyticsRoutes)

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