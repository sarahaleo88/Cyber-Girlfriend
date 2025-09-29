import { Hono } from 'hono'
import { z } from 'zod'
import type { ApiResponse } from '../types'
import { analytics } from '../services/analytics'

const analyticsRoutes = new Hono()

// Validation schemas
const privacySettingsSchema = z.object({
  autoDelete: z.object({
    enabled: z.boolean(),
    daysToKeep: z.number().min(1).max(3650), // Max 10 years
  }).optional(),
  dataExportOptions: z.object({
    includeMetadata: z.boolean(),
    includeAudio: z.boolean(),
  }).optional(),
  storageOptions: z.object({
    localOnly: z.boolean(),
    cloudBackup: z.boolean(),
    encryption: z.boolean(),
  }).optional(),
})

const cleanupOptionsSchema = z.object({
  archiveAfterDays: z.number().min(0).max(3650),
  deleteAfterDays: z.number().min(0).max(3650),
  keepExported: z.boolean().default(false),
})

// GET /api/analytics/stats/:userId - Get conversation statistics
analyticsRoutes.get('/stats/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    if (!userId) {
      return c.json<ApiResponse>({
        success: false,
        error: 'userId parameter is required',
        timestamp: new Date()
      }, 400)
    }

    const stats = await analytics.getConversationStats(userId)

    return c.json<ApiResponse>({
      success: true,
      data: stats,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error getting conversation stats:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to get conversation statistics',
      timestamp: new Date()
    }, 500)
  }
})

// GET /api/analytics/insights/:userId - Get user insights
analyticsRoutes.get('/insights/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    if (!userId) {
      return c.json<ApiResponse>({
        success: false,
        error: 'userId parameter is required',
        timestamp: new Date()
      }, 400)
    }

    const insights = await analytics.getUserInsights(userId)

    return c.json<ApiResponse>({
      success: true,
      data: insights,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error getting user insights:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to get user insights',
      timestamp: new Date()
    }, 500)
  }
})

// GET /api/analytics/health/:userId - Get data health metrics
analyticsRoutes.get('/health/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    if (!userId) {
      return c.json<ApiResponse>({
        success: false,
        error: 'userId parameter is required',
        timestamp: new Date()
      }, 400)
    }

    const health = await analytics.getDataHealthMetrics(userId)

    return c.json<ApiResponse>({
      success: true,
      data: health,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error getting data health metrics:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to get data health metrics',
      timestamp: new Date()
    }, 500)
  }
})

// GET /api/analytics/privacy/:userId - Get privacy settings
analyticsRoutes.get('/privacy/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    if (!userId) {
      return c.json<ApiResponse>({
        success: false,
        error: 'userId parameter is required',
        timestamp: new Date()
      }, 400)
    }

    const privacyOptions = await analytics.getPrivacyOptions(userId)

    return c.json<ApiResponse>({
      success: true,
      data: privacyOptions,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error getting privacy options:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to get privacy options',
      timestamp: new Date()
    }, 500)
  }
})

// PUT /api/analytics/privacy/:userId - Update privacy settings
analyticsRoutes.put('/privacy/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const body = await c.req.json()

    if (!userId) {
      return c.json<ApiResponse>({
        success: false,
        error: 'userId parameter is required',
        timestamp: new Date()
      }, 400)
    }

    const validation = privacySettingsSchema.safeParse(body)
    if (!validation.success) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Invalid privacy settings',
        timestamp: new Date()
      }, 400)
    }

    const updatedSettings = await analytics.updatePrivacySettings(userId, validation.data)

    return c.json<ApiResponse>({
      success: true,
      data: updatedSettings,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error updating privacy settings:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to update privacy settings',
      timestamp: new Date()
    }, 500)
  }
})

// POST /api/analytics/cleanup/:userId - Schedule data cleanup
analyticsRoutes.post('/cleanup/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const body = await c.req.json()

    if (!userId) {
      return c.json<ApiResponse>({
        success: false,
        error: 'userId parameter is required',
        timestamp: new Date()
      }, 400)
    }

    const validation = cleanupOptionsSchema.safeParse(body)
    if (!validation.success) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Invalid cleanup options',
        timestamp: new Date()
      }, 400)
    }

    const result = await analytics.scheduleDataCleanup(userId, validation.data)

    return c.json<ApiResponse>({
      success: true,
      data: result,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error scheduling data cleanup:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to schedule data cleanup',
      timestamp: new Date()
    }, 500)
  }
})

// GET /api/analytics/dashboard/:userId - Get dashboard data
analyticsRoutes.get('/dashboard/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    if (!userId) {
      return c.json<ApiResponse>({
        success: false,
        error: 'userId parameter is required',
        timestamp: new Date()
      }, 400)
    }

    // Get all dashboard data in parallel
    const [stats, insights, health] = await Promise.all([
      analytics.getConversationStats(userId),
      analytics.getUserInsights(userId),
      analytics.getDataHealthMetrics(userId)
    ])

    const dashboardData = {
      stats,
      insights,
      health,
      lastUpdated: new Date()
    }

    return c.json<ApiResponse>({
      success: true,
      data: dashboardData,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error getting dashboard data:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to get dashboard data',
      timestamp: new Date()
    }, 500)
  }
})

// GET /api/analytics/export-summary/:userId - Get export summary
analyticsRoutes.get('/export-summary/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const dateFrom = c.req.query('dateFrom')
    const dateTo = c.req.query('dateTo')

    if (!userId) {
      return c.json<ApiResponse>({
        success: false,
        error: 'userId parameter is required',
        timestamp: new Date()
      }, 400)
    }

    const filter: any = { userId, limit: 1000 }
    if (dateFrom) filter.dateFrom = new Date(dateFrom)
    if (dateTo) filter.dateTo = new Date(dateTo)

    // Import dataPersistence here to avoid circular dependencies
    const { dataPersistence } = await import('../services/data-persistence')
    const conversations = await dataPersistence.getConversations(filter)

    const totalMessages = conversations.reduce((sum, conv) => sum + (conv.messageCount || 0), 0)
    const dateRange = {
      from: dateFrom || (conversations[0]?.startedAt?.toISOString() || new Date().toISOString()),
      to: dateTo || new Date().toISOString()
    }

    // Estimate export sizes
    const estimatedSizes = {
      json: Math.round((totalMessages * 0.5 + conversations.length * 0.1) * 100) / 100, // KB
      markdown: Math.round((totalMessages * 0.8 + conversations.length * 0.2) * 100) / 100, // KB
      txt: Math.round((totalMessages * 0.3 + conversations.length * 0.1) * 100) / 100, // KB
    }

    const exportSummary = {
      totalConversations: conversations.length,
      totalMessages,
      dateRange,
      estimatedSizes,
      availableFormats: ['json', 'markdown', 'txt'],
      exportOptions: {
        includeMetadata: true,
        includeAudio: true,
        dateFiltering: true,
        bulkExport: true
      }
    }

    return c.json<ApiResponse>({
      success: true,
      data: exportSummary,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error getting export summary:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to get export summary',
      timestamp: new Date()
    }, 500)
  }
})

export default analyticsRoutes