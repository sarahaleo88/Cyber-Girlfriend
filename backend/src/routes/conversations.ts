import { Hono } from 'hono'
import { z } from 'zod'
import type { ApiResponse } from '../types'
import { dataPersistence } from '../services/data-persistence'
import { cache } from '../services/cache'
import type { ConversationFilter, MessageFilter, ExportOptions } from '../services/data-persistence'

const conversationRoutes = new Hono()

// Validation schemas
const createConversationSchema = z.object({
  userId: z.string(),
  title: z.string().optional(),
  metadata: z.string().optional(),
})

const addMessageSchema = z.object({
  content: z.string(),
  sender: z.enum(['user', 'ai']),
  type: z.enum(['text', 'audio']).default('text'),
  audioUrl: z.string().optional(),
  emotion: z.enum(['happy', 'sad', 'excited', 'calm', 'thoughtful', 'playful']).optional(),
  metadata: z.string().optional(),
})

const conversationFilterSchema = z.object({
  search: z.string().optional(),
  personality: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
})

const exportSchema = z.object({
  format: z.enum(['json', 'markdown', 'txt']),
  includeMetadata: z.boolean().optional().default(false),
  includeAudio: z.boolean().optional().default(false),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

// GET /api/conversations - Get all conversations for a user
conversationRoutes.get('/', async (c) => {
  try {
    const userId = c.req.query('userId')

    if (!userId) {
      return c.json<ApiResponse>({
        success: false,
        error: 'userId parameter is required',
        timestamp: new Date()
      }, 400)
    }

    const queryParams = {
      search: c.req.query('search'),
      personality: c.req.query('personality'),
      dateFrom: c.req.query('dateFrom'),
      dateTo: c.req.query('dateTo'),
      status: c.req.query('status') as 'active' | 'archived' | 'deleted' | undefined,
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20,
      offset: c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0,
    }

    const validation = conversationFilterSchema.safeParse(queryParams)
    if (!validation.success) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Invalid query parameters',
        timestamp: new Date()
      }, 400)
    }

    const filters = validation.data

    // Check cache first
    const cachedConversations = cache.getCachedConversations(userId, filters)
    if (cachedConversations) {
      return c.json<ApiResponse>({
        success: true,
        data: cachedConversations,
        timestamp: new Date(),
        cached: true
      })
    }

    // Get from database
    const conversations = await dataPersistence.getConversations({
      userId,
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    })

    // Cache the results
    cache.cacheConversations(userId, conversations, filters)

    return c.json<ApiResponse>({
      success: true,
      data: conversations,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error getting conversations:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to get conversations',
      timestamp: new Date()
    }, 500)
  }
})

// POST /api/conversations - Create new conversation
conversationRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const validation = createConversationSchema.safeParse(body)

    if (!validation.success) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Invalid request data',
        timestamp: new Date()
      }, 400)
    }

    const { userId, title, metadata } = validation.data

    const conversation = await dataPersistence.createConversation({
      userId,
      title: title || `Conversation ${new Date().toLocaleDateString()}`,
      metadata,
    })

    // Cache the new conversation
    cache.cacheConversation(conversation)

    // Invalidate user's conversations cache
    cache.invalidateUserConversations(userId)

    return c.json<ApiResponse>({
      success: true,
      data: conversation,
      timestamp: new Date()
    }, 201)
  } catch (error) {
    console.error('Error creating conversation:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to create conversation',
      timestamp: new Date()
    }, 500)
  }
})

// GET /api/conversations/search - Search conversations
conversationRoutes.get('/search', async (c) => {
  try {
    const userId = c.req.query('userId')
    const query = c.req.query('q')
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20

    if (!userId || !query) {
      return c.json<ApiResponse>({
        success: false,
        error: 'userId and query parameters are required',
        timestamp: new Date()
      }, 400)
    }

    // Check cache first
    const cachedResults = cache.getCachedSearchResults(userId, query, limit)
    if (cachedResults) {
      return c.json<ApiResponse>({
        success: true,
        data: cachedResults,
        timestamp: new Date(),
        cached: true
      })
    }

    // Search in database
    const results = await dataPersistence.searchConversations(userId, query, limit)

    // Cache the results
    cache.cacheSearchResults(userId, query, results, limit)

    return c.json<ApiResponse>({
      success: true,
      data: results,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error searching conversations:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to search conversations',
      timestamp: new Date()
    }, 500)
  }
})

// GET /api/conversations/:id - Get specific conversation with stats
conversationRoutes.get('/:id', async (c) => {
  try {
    const conversationId = c.req.param('id')
    const includeStats = c.req.query('includeStats') === 'true'

    // Check cache first
    const cachedConversation = includeStats
      ? cache.getCachedConversationWithStats(conversationId)
      : cache.getCachedConversation(conversationId)

    if (cachedConversation) {
      return c.json<ApiResponse>({
        success: true,
        data: cachedConversation,
        timestamp: new Date(),
        cached: true
      })
    }

    // Get from database
    const conversation = includeStats
      ? await dataPersistence.getConversationWithStats(conversationId)
      : await dataPersistence.getConversation(conversationId)

    if (!conversation) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Conversation not found',
        timestamp: new Date()
      }, 404)
    }

    // Cache the result
    if (includeStats) {
      cache.cacheConversationWithStats(conversation)
    } else {
      cache.cacheConversation(conversation)
    }

    return c.json<ApiResponse>({
      success: true,
      data: conversation,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error getting conversation:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to get conversation',
      timestamp: new Date()
    }, 500)
  }
})

// PUT /api/conversations/:id - Update conversation
conversationRoutes.put('/:id', async (c) => {
  try {
    const conversationId = c.req.param('id')
    const body = await c.req.json()

    // Allow updating title, metadata, and isActive status
    const updates: any = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.metadata !== undefined) updates.metadata = body.metadata
    if (body.isActive !== undefined) updates.isActive = body.isActive

    if (Object.keys(updates).length === 0) {
      return c.json<ApiResponse>({
        success: false,
        error: 'No valid updates provided',
        timestamp: new Date()
      }, 400)
    }

    const conversation = await dataPersistence.updateConversation(conversationId, updates)

    // Invalidate related caches
    cache.invalidateOnConversationUpdate(conversationId, conversation.userId)

    return c.json<ApiResponse>({
      success: true,
      data: conversation,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error updating conversation:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to update conversation',
      timestamp: new Date()
    }, 500)
  }
})

// DELETE /api/conversations/:id - Delete conversation
conversationRoutes.delete('/:id', async (c) => {
  try {
    const conversationId = c.req.param('id')

    // Get conversation to find userId for cache invalidation
    const conversation = await dataPersistence.getConversation(conversationId)
    if (!conversation) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Conversation not found',
        timestamp: new Date()
      }, 404)
    }

    await dataPersistence.deleteConversation(conversationId)

    // Invalidate all related caches
    cache.invalidateOnConversationDelete(conversationId, conversation.userId)

    return c.json<ApiResponse>({
      success: true,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to delete conversation',
      timestamp: new Date()
    }, 500)
  }
})

// GET /api/conversations/:id/messages - Get messages for a conversation
conversationRoutes.get('/:id/messages', async (c) => {
  try {
    const conversationId = c.req.param('id')
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 100
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0
    const sender = c.req.query('sender') as 'user' | 'ai' | undefined
    const type = c.req.query('type') as 'text' | 'audio' | undefined
    const emotion = c.req.query('emotion')

    // Check cache first
    const cachedMessages = cache.getCachedMessages(conversationId, offset, limit)
    if (cachedMessages && !sender && !type && !emotion) {
      return c.json<ApiResponse>({
        success: true,
        data: cachedMessages,
        timestamp: new Date(),
        cached: true
      })
    }

    // Get from database
    const messages = await dataPersistence.getMessages({
      conversationId,
      limit,
      offset,
      sender,
      type,
      emotion,
    })

    // Cache only simple queries (no filters)
    if (!sender && !type && !emotion) {
      cache.cacheMessages(conversationId, messages, offset, limit)
    }

    return c.json<ApiResponse>({
      success: true,
      data: messages,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error getting messages:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to get messages',
      timestamp: new Date()
    }, 500)
  }
})

// POST /api/conversations/:id/messages - Add message to conversation
conversationRoutes.post('/:id/messages', async (c) => {
  try {
    const conversationId = c.req.param('id')
    const body = await c.req.json()
    const validation = addMessageSchema.safeParse(body)

    if (!validation.success) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Invalid message data',
        timestamp: new Date()
      }, 400)
    }

    // Check if conversation exists
    const conversation = await dataPersistence.getConversation(conversationId)
    if (!conversation) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Conversation not found',
        timestamp: new Date()
      }, 404)
    }

    const messageData = validation.data
    const message = await dataPersistence.createMessage({
      conversationId,
      ...messageData,
    })

    // Invalidate related caches
    cache.invalidateOnNewMessage(conversationId, conversation.userId)

    return c.json<ApiResponse>({
      success: true,
      data: message,
      timestamp: new Date()
    }, 201)
  } catch (error) {
    console.error('Error adding message:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to add message',
      timestamp: new Date()
    }, 500)
  }
})

// GET /api/conversations/:id/export - Export conversation
conversationRoutes.get('/:id/export', async (c) => {
  try {
    const conversationId = c.req.param('id')
    const format = c.req.query('format') as 'json' | 'markdown' | 'txt' || 'json'
    const includeMetadata = c.req.query('includeMetadata') === 'true'
    const includeAudio = c.req.query('includeAudio') === 'true'
    const dateFrom = c.req.query('dateFrom')
    const dateTo = c.req.query('dateTo')

    const validation = exportSchema.safeParse({
      format,
      includeMetadata,
      includeAudio,
      dateFrom,
      dateTo,
    })

    if (!validation.success) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Invalid export parameters',
        timestamp: new Date()
      }, 400)
    }

    const options: ExportOptions = {
      format,
      includeMetadata,
      includeAudio,
      ...(dateFrom || dateTo ? {
        dateFilter: {
          from: dateFrom ? new Date(dateFrom) : undefined,
          to: dateTo ? new Date(dateTo) : undefined,
        }
      } : {})
    }

    const exportContent = await dataPersistence.exportConversation(conversationId, options)

    // Set appropriate content type and filename
    const conversation = await dataPersistence.getConversation(conversationId)
    const filename = `${conversation?.title || 'conversation'}.${format}`
    const contentType = {
      json: 'application/json',
      markdown: 'text/markdown',
      txt: 'text/plain'
    }[format]

    return new Response(exportContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    })
  } catch (error) {
    console.error('Error exporting conversation:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to export conversation',
      timestamp: new Date()
    }, 500)
  }
})

// POST /api/conversations/export/bulk - Bulk export conversations
conversationRoutes.post('/export/bulk', async (c) => {
  try {
    const body = await c.req.json()
    const { conversationIds, format = 'json', includeMetadata = false, includeAudio = false, dateFrom, dateTo } = body

    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
      return c.json<ApiResponse>({
        success: false,
        error: 'conversationIds array is required',
        timestamp: new Date()
      }, 400)
    }

    const options: ExportOptions = {
      format,
      includeMetadata,
      includeAudio,
      ...(dateFrom || dateTo ? {
        dateFilter: {
          from: dateFrom ? new Date(dateFrom) : undefined,
          to: dateTo ? new Date(dateTo) : undefined,
        }
      } : {})
    }

    const exports = await Promise.all(
      conversationIds.map(async (id: string) => {
        const content = await dataPersistence.exportConversation(id, options)
        const conversation = await dataPersistence.getConversation(id)
        return {
          conversationId: id,
          title: conversation?.title || 'Unknown',
          content
        }
      })
    )

    const bulkExport = {
      exportedAt: new Date(),
      format,
      conversations: exports,
      totalConversations: exports.length
    }

    const filename = `conversations_bulk_${new Date().toISOString().split('T')[0]}.json`

    return new Response(JSON.stringify(bulkExport, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    })
  } catch (error) {
    console.error('Error bulk exporting conversations:', error)
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to bulk export conversations',
      timestamp: new Date()
    }, 500)
  }
})

export default conversationRoutes