import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  avatar: text('avatar'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
})

// User preferences table
export const userPreferences = sqliteTable('user_preferences', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),

  // Voice settings
  voicePitch: real('voice_pitch').default(1.0),
  voiceSpeed: real('voice_speed').default(1.0),
  voiceType: text('voice_type', { enum: ['alloy', 'echo', 'fable', 'nova', 'shimmer'] }).default('nova'),
  voiceVolume: real('voice_volume').default(0.8),

  // Personality traits (0-100)
  playfulness: integer('playfulness').default(70),
  empathy: integer('empathy').default(80),
  humor: integer('humor').default(60),
  intelligence: integer('intelligence').default(85),
  supportiveness: integer('supportiveness').default(90),

  // Conversation style
  formality: text('formality', { enum: ['casual', 'friendly', 'formal'] }).default('friendly'),
  topics: text('topics'), // JSON string of array
  responseLength: text('response_length', { enum: ['short', 'medium', 'long'] }).default('medium'),

  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
})

// Conversations table
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  metadata: text('metadata'), // JSON string for additional data
})

// Messages table
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  sender: text('sender', { enum: ['user', 'ai'] }).notNull(),
  type: text('type', { enum: ['text', 'audio'] }).default('text'),
  audioUrl: text('audio_url'),
  emotion: text('emotion', { enum: ['happy', 'sad', 'excited', 'calm', 'thoughtful', 'playful'] }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  metadata: text('metadata'), // JSON string for additional data
})

// Voice sessions table (for tracking voice interactions)
export const voiceSessions = sqliteTable('voice_sessions', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  startedAt: integer('started_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  duration: integer('duration'), // in seconds
  audioQuality: text('audio_quality'),
  metadata: text('metadata'), // JSON string for additional data
})

// Database types for TypeScript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserPreferences = typeof userPreferences.$inferSelect
export type NewUserPreferences = typeof userPreferences.$inferInsert
export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type VoiceSession = typeof voiceSessions.$inferSelect
export type NewVoiceSession = typeof voiceSessions.$inferInsert