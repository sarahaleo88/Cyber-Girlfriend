import { Hono } from 'hono'
import { z } from 'zod'
import type { User, UserPreferences, ApiResponse } from '../types'

const userRoutes = new Hono()

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
})

const updatePreferencesSchema = z.object({
  voiceSettings: z.object({
    pitch: z.number().min(0.5).max(2.0),
    speed: z.number().min(0.5).max(2.0),
    voice: z.enum(['alloy', 'echo', 'fable', 'nova', 'shimmer']),
    volume: z.number().min(0.0).max(1.0),
  }).optional(),
  personalityTraits: z.object({
    playfulness: z.number().min(0).max(100),
    empathy: z.number().min(0).max(100),
    humor: z.number().min(0).max(100),
    intelligence: z.number().min(0).max(100),
    supportiveness: z.number().min(0).max(100),
  }).optional(),
  conversationStyle: z.object({
    formality: z.enum(['casual', 'friendly', 'formal']),
    topics: z.array(z.string()),
    responseLength: z.enum(['short', 'medium', 'long']),
  }).optional(),
})

// Mock data for development
const mockUsers: User[] = []

// Default preferences for new users
const defaultPreferences: UserPreferences = {
  voiceSettings: {
    pitch: 1.0,
    speed: 1.0,
    voice: 'nova',
    volume: 0.8,
  },
  personalityTraits: {
    playfulness: 70,
    empathy: 80,
    humor: 60,
    intelligence: 85,
    supportiveness: 90,
  },
  conversationStyle: {
    formality: 'friendly',
    topics: ['general', 'technology', 'relationships', 'entertainment'],
    responseLength: 'medium',
  },
}

// POST /api/users - Create new user
userRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const validation = createUserSchema.safeParse(body)

    if (!validation.success) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Invalid user data',
        timestamp: new Date()
      }, 400)
    }

    const { name, email, avatar } = validation.data
    const now = new Date()

    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email,
      avatar,
      createdAt: now,
      updatedAt: now,
      preferences: { ...defaultPreferences },
    }

    mockUsers.push(newUser)

    return c.json<ApiResponse<User>>({
      success: true,
      data: newUser,
      timestamp: new Date()
    }, 201)
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to create user',
      timestamp: new Date()
    }, 500)
  }
})

// GET /api/users/:id - Get user by ID
userRoutes.get('/:id', async (c) => {
  const userId = c.req.param('id')
  const user = mockUsers.find(u => u.id === userId)

  if (!user) {
    return c.json<ApiResponse>({
      success: false,
      error: 'User not found',
      timestamp: new Date()
    }, 404)
  }

  return c.json<ApiResponse<User>>({
    success: true,
    data: user,
    timestamp: new Date()
  })
})

// PUT /api/users/:id - Update user
userRoutes.put('/:id', async (c) => {
  try {
    const userId = c.req.param('id')
    const body = await c.req.json()

    const user = mockUsers.find(u => u.id === userId)
    if (!user) {
      return c.json<ApiResponse>({
        success: false,
        error: 'User not found',
        timestamp: new Date()
      }, 404)
    }

    // Update basic user fields
    if (body.name) user.name = body.name
    if (body.email) user.email = body.email
    if (body.avatar) user.avatar = body.avatar
    user.updatedAt = new Date()

    return c.json<ApiResponse<User>>({
      success: true,
      data: user,
      timestamp: new Date()
    })
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to update user',
      timestamp: new Date()
    }, 500)
  }
})

// PUT /api/users/:id/preferences - Update user preferences
userRoutes.put('/:id/preferences', async (c) => {
  try {
    const userId = c.req.param('id')
    const body = await c.req.json()
    const validation = updatePreferencesSchema.safeParse(body)

    if (!validation.success) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Invalid preferences data',
        timestamp: new Date()
      }, 400)
    }

    const user = mockUsers.find(u => u.id === userId)
    if (!user) {
      return c.json<ApiResponse>({
        success: false,
        error: 'User not found',
        timestamp: new Date()
      }, 404)
    }

    const updatedPreferences = validation.data

    // Merge preferences
    if (updatedPreferences.voiceSettings) {
      user.preferences.voiceSettings = {
        ...user.preferences.voiceSettings,
        ...updatedPreferences.voiceSettings,
      }
    }

    if (updatedPreferences.personalityTraits) {
      user.preferences.personalityTraits = {
        ...user.preferences.personalityTraits,
        ...updatedPreferences.personalityTraits,
      }
    }

    if (updatedPreferences.conversationStyle) {
      user.preferences.conversationStyle = {
        ...user.preferences.conversationStyle,
        ...updatedPreferences.conversationStyle,
      }
    }

    user.updatedAt = new Date()

    return c.json<ApiResponse<UserPreferences>>({
      success: true,
      data: user.preferences,
      timestamp: new Date()
    })
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to update preferences',
      timestamp: new Date()
    }, 500)
  }
})

// GET /api/users/:id/preferences - Get user preferences
userRoutes.get('/:id/preferences', async (c) => {
  const userId = c.req.param('id')
  const user = mockUsers.find(u => u.id === userId)

  if (!user) {
    return c.json<ApiResponse>({
      success: false,
      error: 'User not found',
      timestamp: new Date()
    }, 404)
  }

  return c.json<ApiResponse<UserPreferences>>({
    success: true,
    data: user.preferences,
    timestamp: new Date()
  })
})

// DELETE /api/users/:id - Delete user
userRoutes.delete('/:id', async (c) => {
  const userId = c.req.param('id')
  const index = mockUsers.findIndex(u => u.id === userId)

  if (index === -1) {
    return c.json<ApiResponse>({
      success: false,
      error: 'User not found',
      timestamp: new Date()
    }, 404)
  }

  mockUsers.splice(index, 1)

  return c.json<ApiResponse>({
    success: true,
    timestamp: new Date()
  })
})

export default userRoutes