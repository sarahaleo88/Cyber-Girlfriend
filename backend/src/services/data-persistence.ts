import { eq, desc, asc, and, or, like, sql, count, gte, lte } from 'drizzle-orm'
import { db } from '../db/index'
import { conversations, messages, users, userPreferences } from '../db/schema'
import type { Conversation, Message, NewConversation, NewMessage } from '../db/schema'

export interface ConversationWithStats extends Conversation {
  messageCount?: number
  audioDuration?: number
}

export interface ConversationFilter {
  userId: string
  search?: string
  personality?: string
  dateFrom?: Date
  dateTo?: Date
  status?: 'active' | 'archived' | 'deleted'
  limit?: number
  offset?: number
}

export interface MessageFilter {
  conversationId: string
  sender?: 'user' | 'ai'
  type?: 'text' | 'audio'
  emotion?: string
  limit?: number
  offset?: number
}

export interface ExportOptions {
  format: 'json' | 'markdown' | 'txt'
  includeMetadata?: boolean
  includeAudio?: boolean
  dateFilter?: {
    from?: Date
    to?: Date
  }
}

export class DataPersistenceService {
  // Conversation Operations
  async createConversation(data: NewConversation): Promise<Conversation> {
    try {
      const conversation = await db.insert(conversations).values({
        id: crypto.randomUUID(),
        ...data,
        startedAt: data.startedAt || new Date(),
        lastActivityAt: data.lastActivityAt || new Date(),
        isActive: data.isActive !== undefined ? data.isActive : true,
      }).returning()

      return conversation[0]
    } catch (error) {
      console.error('Failed to create conversation:', error)
      throw new Error('Failed to create conversation')
    }
  }

  async getConversation(id: string): Promise<Conversation | null> {
    try {
      const result = await db.select()
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1)

      return result[0] || null
    } catch (error) {
      console.error('Failed to get conversation:', error)
      throw new Error('Failed to get conversation')
    }
  }

  async getConversationWithStats(id: string): Promise<ConversationWithStats | null> {
    try {
      const conversationQuery = db.select()
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1)

      const messageCountQuery = db.select({ count: count() })
        .from(messages)
        .where(eq(messages.conversationId, id))

      const audioDurationQuery = db.select({
        duration: sql<number>`COALESCE(SUM(CASE WHEN ${messages.type} = 'audio' THEN 1 ELSE 0 END), 0)`
      }).from(messages).where(eq(messages.conversationId, id))

      const [conversationResult, messageCountResult, audioDurationResult] = await Promise.all([
        conversationQuery,
        messageCountQuery,
        audioDurationQuery
      ])

      if (!conversationResult[0]) {
        return null
      }

      return {
        ...conversationResult[0],
        messageCount: messageCountResult[0]?.count || 0,
        audioDuration: audioDurationResult[0]?.duration || 0
      }
    } catch (error) {
      console.error('Failed to get conversation with stats:', error)
      throw new Error('Failed to get conversation with stats')
    }
  }

  async getConversations(filter: ConversationFilter): Promise<ConversationWithStats[]> {
    try {
      let query = db.select({
        id: conversations.id,
        userId: conversations.userId,
        title: conversations.title,
        startedAt: conversations.startedAt,
        lastActivityAt: conversations.lastActivityAt,
        isActive: conversations.isActive,
        metadata: conversations.metadata,
        messageCount: count(messages.id)
      })
      .from(conversations)
      .leftJoin(messages, eq(conversations.id, messages.conversationId))
      .where(eq(conversations.userId, filter.userId))
      .groupBy(conversations.id)

      // Apply filters
      const conditions: any[] = [eq(conversations.userId, filter.userId)]

      if (filter.search) {
        conditions.push(
          or(
            like(conversations.title, `%${filter.search}%`),
            like(conversations.metadata, `%${filter.search}%`)
          )
        )
      }

      if (filter.dateFrom) {
        conditions.push(gte(conversations.startedAt, filter.dateFrom))
      }

      if (filter.dateTo) {
        conditions.push(lte(conversations.startedAt, filter.dateTo))
      }

      if (filter.status) {
        conditions.push(eq(conversations.isActive, filter.status === 'active'))
      }

      if (conditions.length > 1) {
        query = query.where(and(...conditions))
      }

      // Apply ordering, limit, and offset
      query = query
        .orderBy(desc(conversations.lastActivityAt))
        .limit(filter.limit || 50)
        .offset(filter.offset || 0)

      const result = await query

      return result.map(row => ({
        id: row.id,
        userId: row.userId,
        title: row.title,
        startedAt: row.startedAt,
        lastActivityAt: row.lastActivityAt,
        isActive: row.isActive,
        metadata: row.metadata,
        messageCount: row.messageCount
      }))
    } catch (error) {
      console.error('Failed to get conversations:', error)
      throw new Error('Failed to get conversations')
    }
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    try {
      const result = await db.update(conversations)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, id))
        .returning()

      if (!result[0]) {
        throw new Error('Conversation not found')
      }

      return result[0]
    } catch (error) {
      console.error('Failed to update conversation:', error)
      throw new Error('Failed to update conversation')
    }
  }

  async deleteConversation(id: string): Promise<void> {
    try {
      // Delete messages first (cascade should handle this, but being explicit)
      await db.delete(messages).where(eq(messages.conversationId, id))

      // Delete conversation
      const result = await db.delete(conversations).where(eq(conversations.id, id))

      if (!result.changes) {
        throw new Error('Conversation not found')
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      throw new Error('Failed to delete conversation')
    }
  }

  // Message Operations
  async createMessage(data: NewMessage): Promise<Message> {
    try {
      const message = await db.insert(messages).values({
        id: crypto.randomUUID(),
        ...data,
        timestamp: data.timestamp || new Date(),
      }).returning()

      // Update conversation last activity
      await db.update(conversations)
        .set({ lastActivityAt: new Date() })
        .where(eq(conversations.id, data.conversationId))

      return message[0]
    } catch (error) {
      console.error('Failed to create message:', error)
      throw new Error('Failed to create message')
    }
  }

  async getMessages(filter: MessageFilter): Promise<Message[]> {
    try {
      let query = db.select()
        .from(messages)
        .where(eq(messages.conversationId, filter.conversationId))

      // Apply filters
      const conditions: any[] = [eq(messages.conversationId, filter.conversationId)]

      if (filter.sender) {
        conditions.push(eq(messages.sender, filter.sender))
      }

      if (filter.type) {
        conditions.push(eq(messages.type, filter.type))
      }

      if (filter.emotion) {
        conditions.push(eq(messages.emotion, filter.emotion))
      }

      if (conditions.length > 1) {
        query = query.where(and(...conditions))
      }

      // Apply ordering, limit, and offset
      query = query
        .orderBy(asc(messages.timestamp))
        .limit(filter.limit || 100)
        .offset(filter.offset || 0)

      return await query
    } catch (error) {
      console.error('Failed to get messages:', error)
      throw new Error('Failed to get messages')
    }
  }

  async deleteMessage(id: string): Promise<void> {
    try {
      const result = await db.delete(messages).where(eq(messages.id, id))

      if (!result.changes) {
        throw new Error('Message not found')
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
      throw new Error('Failed to delete message')
    }
  }

  // Search Operations
  async searchConversations(userId: string, query: string, limit: number = 20): Promise<ConversationWithStats[]> {
    try {
      const searchTerm = `%${query}%`

      const result = await db.select({
        id: conversations.id,
        userId: conversations.userId,
        title: conversations.title,
        startedAt: conversations.startedAt,
        lastActivityAt: conversations.lastActivityAt,
        isActive: conversations.isActive,
        metadata: conversations.metadata,
        messageCount: count(messages.id)
      })
      .from(conversations)
      .leftJoin(messages, eq(conversations.id, messages.conversationId))
      .where(
        and(
          eq(conversations.userId, userId),
          or(
            like(conversations.title, searchTerm),
            like(conversations.metadata, searchTerm),
            like(messages.content, searchTerm)
          )
        )
      )
      .groupBy(conversations.id)
      .orderBy(desc(conversations.lastActivityAt))
      .limit(limit)

      return result.map(row => ({
        id: row.id,
        userId: row.userId,
        title: row.title,
        startedAt: row.startedAt,
        lastActivityAt: row.lastActivityAt,
        isActive: row.isActive,
        metadata: row.metadata,
        messageCount: row.messageCount
      }))
    } catch (error) {
      console.error('Failed to search conversations:', error)
      throw new Error('Failed to search conversations')
    }
  }

  // Export Operations
  async exportConversation(id: string, options: ExportOptions): Promise<string> {
    try {
      const conversation = await this.getConversationWithStats(id)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      const messages = await this.getMessages({
        conversationId: id,
        limit: 1000 // Export all messages
      })

      // Filter messages by date if specified
      let filteredMessages = messages
      if (options.dateFilter?.from) {
        filteredMessages = filteredMessages.filter(m =>
          m.timestamp >= options.dateFilter!.from!
        )
      }
      if (options.dateFilter?.to) {
        filteredMessages = filteredMessages.filter(m =>
          m.timestamp <= options.dateFilter!.to!
        )
      }

      switch (options.format) {
        case 'json':
          return this.exportToJSON(conversation, filteredMessages, options)
        case 'markdown':
          return this.exportToMarkdown(conversation, filteredMessages, options)
        case 'txt':
          return this.exportToText(conversation, filteredMessages, options)
        default:
          throw new Error('Unsupported export format')
      }
    } catch (error) {
      console.error('Failed to export conversation:', error)
      throw new Error('Failed to export conversation')
    }
  }

  private exportToJSON(conversation: ConversationWithStats, messages: Message[], options: ExportOptions): string {
    const exportData = {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        startedAt: conversation.startedAt,
        lastActivityAt: conversation.lastActivityAt,
        messageCount: conversation.messageCount,
        ...(options.includeMetadata && { metadata: conversation.metadata })
      },
      messages: messages.map(msg => ({
        id: msg.id,
        sender: msg.sender,
        content: msg.content,
        type: msg.type,
        timestamp: msg.timestamp,
        ...(msg.emotion && { emotion: msg.emotion }),
        ...(options.includeAudio && msg.audioUrl && { audioUrl: msg.audioUrl }),
        ...(options.includeMetadata && msg.metadata && { metadata: msg.metadata })
      })),
      exportedAt: new Date(),
      format: 'json'
    }

    return JSON.stringify(exportData, null, 2)
  }

  private exportToMarkdown(conversation: ConversationWithStats, messages: Message[], options: ExportOptions): string {
    let markdown = `# ${conversation.title}\n\n`

    if (options.includeMetadata) {
      markdown += `**Conversation ID:** ${conversation.id}\n`
      markdown += `**Started:** ${conversation.startedAt.toLocaleString()}\n`
      markdown += `**Last Activity:** ${conversation.lastActivityAt.toLocaleString()}\n`
      markdown += `**Messages:** ${conversation.messageCount || messages.length}\n\n`
    }

    markdown += `---\n\n`

    messages.forEach(msg => {
      const timestamp = msg.timestamp.toLocaleString()
      const sender = msg.sender === 'user' ? '👤 You' : '🤖 Assistant'
      const emotion = msg.emotion ? ` (${msg.emotion})` : ''

      markdown += `## ${sender}${emotion}\n`
      markdown += `*${timestamp}*\n\n`
      markdown += `${msg.content}\n\n`

      if (options.includeAudio && msg.audioUrl) {
        markdown += `🎵 Audio: ${msg.audioUrl}\n\n`
      }

      markdown += `---\n\n`
    })

    if (options.includeMetadata) {
      markdown += `\n*Exported on ${new Date().toLocaleString()}*\n`
    }

    return markdown
  }

  private exportToText(conversation: ConversationWithStats, messages: Message[], options: ExportOptions): string {
    let text = `${conversation.title}\n`
    text += `${'='.repeat(conversation.title.length)}\n\n`

    if (options.includeMetadata) {
      text += `Conversation started: ${conversation.startedAt.toLocaleString()}\n`
      text += `Last activity: ${conversation.lastActivityAt.toLocaleString()}\n`
      text += `Total messages: ${conversation.messageCount || messages.length}\n\n`
    }

    messages.forEach(msg => {
      const timestamp = msg.timestamp.toLocaleString()
      const sender = msg.sender === 'user' ? 'You' : 'Assistant'
      const emotion = msg.emotion ? ` (${msg.emotion})` : ''

      text += `[${timestamp}] ${sender}${emotion}:\n`
      text += `${msg.content}\n\n`

      if (options.includeAudio && msg.audioUrl) {
        text += `Audio: ${msg.audioUrl}\n\n`
      }
    })

    if (options.includeMetadata) {
      text += `\nExported on ${new Date().toLocaleString()}\n`
    }

    return text
  }

  // Statistics Operations
  async getConversationStats(userId: string): Promise<{
    totalConversations: number
    activeConversations: number
    totalMessages: number
    averageMessagesPerConversation: number
    mostActiveDay: string
    totalAudioMessages: number
  }> {
    try {
      const totalConversationsQuery = db.select({ count: count() })
        .from(conversations)
        .where(eq(conversations.userId, userId))

      const activeConversationsQuery = db.select({ count: count() })
        .from(conversations)
        .where(and(
          eq(conversations.userId, userId),
          eq(conversations.isActive, true)
        ))

      const totalMessagesQuery = db.select({ count: count() })
        .from(messages)
        .leftJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(eq(conversations.userId, userId))

      const audioMessagesQuery = db.select({ count: count() })
        .from(messages)
        .leftJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(and(
          eq(conversations.userId, userId),
          eq(messages.type, 'audio')
        ))

      const [totalConv, activeConv, totalMsgs, audioMsgs] = await Promise.all([
        totalConversationsQuery,
        activeConversationsQuery,
        totalMessagesQuery,
        audioMessagesQuery
      ])

      const totalConversations = totalConv[0]?.count || 0
      const totalMessages = totalMsgs[0]?.count || 0
      const averageMessagesPerConversation = totalConversations > 0
        ? Math.round(totalMessages / totalConversations)
        : 0

      return {
        totalConversations,
        activeConversations: activeConv[0]?.count || 0,
        totalMessages,
        averageMessagesPerConversation,
        mostActiveDay: 'Today', // Simplified for now
        totalAudioMessages: audioMsgs[0]?.count || 0
      }
    } catch (error) {
      console.error('Failed to get conversation stats:', error)
      throw new Error('Failed to get conversation stats')
    }
  }

  // Cleanup Operations
  async archiveOldConversations(userId: string, daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const result = await db.update(conversations)
        .set({ isActive: false })
        .where(and(
          eq(conversations.userId, userId),
          lte(conversations.lastActivityAt, cutoffDate),
          eq(conversations.isActive, true)
        ))

      return result.changes || 0
    } catch (error) {
      console.error('Failed to archive old conversations:', error)
      throw new Error('Failed to archive old conversations')
    }
  }

  async deleteOldConversations(userId: string, daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      // Get conversations to delete
      const conversationsToDelete = await db.select({ id: conversations.id })
        .from(conversations)
        .where(and(
          eq(conversations.userId, userId),
          lte(conversations.lastActivityAt, cutoffDate)
        ))

      let deletedCount = 0
      for (const conv of conversationsToDelete) {
        await this.deleteConversation(conv.id)
        deletedCount++
      }

      return deletedCount
    } catch (error) {
      console.error('Failed to delete old conversations:', error)
      throw new Error('Failed to delete old conversations')
    }
  }
}

// Export singleton instance
export const dataPersistence = new DataPersistenceService()