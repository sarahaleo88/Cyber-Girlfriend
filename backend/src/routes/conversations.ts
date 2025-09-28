import { Hono } from 'hono'
import { z } from 'zod'
import type { Conversation, Message, ApiResponse } from '../types'

const conversationRoutes = new Hono()

// Validation schemas
const createConversationSchema = z.object({
  userId: z.string(),
  title: z.string().optional(),
})

const addMessageSchema = z.object({
  content: z.string(),
  sender: z.enum(['user', 'ai']),
  type: z.enum(['text', 'audio']).default('text'),
  audioUrl: z.string().optional(),
  emotion: z.enum(['happy', 'sad', 'excited', 'calm', 'thoughtful', 'playful']).optional(),
})

// Mock data for development
const mockConversations: Conversation[] = []
const mockMessages: Message[] = []

// GET /api/conversations - Get all conversations for a user
conversationRoutes.get('/', async (c) => {
  const userId = c.req.query('userId')

  if (!userId) {
    return c.json<ApiResponse>({
      success: false,
      error: 'userId parameter is required',
      timestamp: new Date()
    }, 400)
  }

  const userConversations = mockConversations.filter(conv => conv.userId === userId)

  return c.json<ApiResponse<Conversation[]>>({
    success: true,
    data: userConversations,
    timestamp: new Date()
  })
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

    const { userId, title } = validation.data
    const now = new Date()

    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      userId,
      title: title || `Conversation ${new Date().toLocaleDateString()}`,
      startedAt: now,
      lastActivityAt: now,
      isActive: true,
    }

    mockConversations.push(newConversation)

    return c.json<ApiResponse<Conversation>>({
      success: true,
      data: newConversation,
      timestamp: new Date()
    }, 201)
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to create conversation',
      timestamp: new Date()
    }, 500)
  }
})

// GET /api/conversations/:id - Get specific conversation
conversationRoutes.get('/:id', async (c) => {
  const conversationId = c.req.param('id')
  const conversation = mockConversations.find(conv => conv.id === conversationId)

  if (!conversation) {
    return c.json<ApiResponse>({
      success: false,
      error: 'Conversation not found',
      timestamp: new Date()
    }, 404)
  }

  return c.json<ApiResponse<Conversation>>({
    success: true,
    data: conversation,
    timestamp: new Date()
  })
})

// GET /api/conversations/:id/messages - Get messages for a conversation
conversationRoutes.get('/:id/messages', async (c) => {
  const conversationId = c.req.param('id')
  const conversationMessages = mockMessages
    .filter(msg => msg.conversationId === conversationId)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return c.json<ApiResponse<Message[]>>({
    success: true,
    data: conversationMessages,
    timestamp: new Date()
  })
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
    const conversation = mockConversations.find(conv => conv.id === conversationId)
    if (!conversation) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Conversation not found',
        timestamp: new Date()
      }, 404)
    }

    const messageData = validation.data
    const newMessage: Message = {
      id: crypto.randomUUID(),
      conversationId,
      ...messageData,
      timestamp: new Date(),
    }

    mockMessages.push(newMessage)

    // Update conversation last activity
    conversation.lastActivityAt = new Date()

    return c.json<ApiResponse<Message>>({
      success: true,
      data: newMessage,
      timestamp: new Date()
    }, 201)
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to add message',
      timestamp: new Date()
    }, 500)
  }
})

// DELETE /api/conversations/:id - Delete conversation
conversationRoutes.delete('/:id', async (c) => {
  const conversationId = c.req.param('id')
  const index = mockConversations.findIndex(conv => conv.id === conversationId)

  if (index === -1) {
    return c.json<ApiResponse>({
      success: false,
      error: 'Conversation not found',
      timestamp: new Date()
    }, 404)
  }

  // Remove conversation and its messages
  mockConversations.splice(index, 1)
  const messageIndices = mockMessages
    .map((msg, idx) => msg.conversationId === conversationId ? idx : -1)
    .filter(idx => idx !== -1)
    .reverse() // Remove from end to start to maintain indices

  messageIndices.forEach(idx => mockMessages.splice(idx, 1))

  return c.json<ApiResponse>({
    success: true,
    timestamp: new Date()
  })
})

export default conversationRoutes