import { dataPersistence } from './data-persistence'
import { cache } from './cache'

export interface ConversationStats {
  totalConversations: number
  activeConversations: number
  archivedConversations: number
  totalMessages: number
  averageMessagesPerConversation: number
  totalAudioMessages: number
  averageConversationDuration: number // in minutes
  mostActiveDay: string
  mostActiveHour: number
  messagesByEmotion: Record<string, number>
  messagesByType: Record<'text' | 'audio', number>
  conversationsByMonth: Array<{ month: string; count: number }>
  recentActivity: Array<{ date: string; messages: number; conversations: number }>
}

export interface UserInsights {
  preferredEmotions: string[]
  chattingPattern: 'morning' | 'afternoon' | 'evening' | 'night' | 'mixed'
  averageSessionLength: number // in minutes
  longestConversation: {
    id: string
    title: string
    messageCount: number
    duration: number
  }
  engagementTrend: 'increasing' | 'decreasing' | 'stable'
  topTopics: string[] // extracted from conversation titles/metadata
}

export interface DataHealthMetrics {
  databaseSize: number // in MB
  oldestConversation: Date | null
  newestConversation: Date | null
  orphanedMessages: number
  corruptedEntries: number
  recommendedCleanup: {
    conversationsToArchive: number
    conversationsToDelete: number
    estimatedSpaceSaved: number // in MB
  }
}

export class AnalyticsService {
  // Conversation Statistics
  async getConversationStats(userId: string): Promise<ConversationStats> {
    try {
      // Check cache first
      const cachedStats = cache.getCachedStats(userId)
      if (cachedStats) {
        return cachedStats
      }

      // Get basic stats from data persistence service
      const basicStats = await dataPersistence.getConversationStats(userId)

      // Get additional analytics
      const [
        emotionStats,
        typeStats,
        monthlyStats,
        recentActivity,
        timePatterns
      ] = await Promise.all([
        this.getEmotionDistribution(userId),
        this.getMessageTypeDistribution(userId),
        this.getMonthlyConversationStats(userId),
        this.getRecentActivityStats(userId),
        this.getTimePatterns(userId)
      ])

      const stats: ConversationStats = {
        ...basicStats,
        messagesByEmotion: emotionStats,
        messagesByType: typeStats,
        conversationsByMonth: monthlyStats,
        recentActivity,
        mostActiveHour: timePatterns.mostActiveHour,
        averageConversationDuration: timePatterns.averageDuration
      }

      // Cache the results
      cache.cacheStats(userId, stats)

      return stats
    } catch (error) {
      console.error('Failed to get conversation stats:', error)
      throw new Error('Failed to get conversation stats')
    }
  }

  // User Insights
  async getUserInsights(userId: string): Promise<UserInsights> {
    try {
      const cacheKey = `insights:${userId}`
      const cachedInsights = cache.getCachedStats(cacheKey)
      if (cachedInsights) {
        return cachedInsights
      }

      const [
        emotions,
        chattingPattern,
        sessionLength,
        longestConv,
        trend,
        topics
      ] = await Promise.all([
        this.getPreferredEmotions(userId),
        this.getChattingPattern(userId),
        this.getAverageSessionLength(userId),
        this.getLongestConversation(userId),
        this.getEngagementTrend(userId),
        this.extractTopTopics(userId)
      ])

      const insights: UserInsights = {
        preferredEmotions: emotions,
        chattingPattern,
        averageSessionLength: sessionLength,
        longestConversation: longestConv,
        engagementTrend: trend,
        topTopics: topics
      }

      cache.cacheStats(cacheKey, insights)
      return insights
    } catch (error) {
      console.error('Failed to get user insights:', error)
      throw new Error('Failed to get user insights')
    }
  }

  // Data Health Metrics
  async getDataHealthMetrics(userId: string): Promise<DataHealthMetrics> {
    try {
      // This would typically involve direct database queries
      // For now, we'll provide estimates based on available data
      const conversations = await dataPersistence.getConversations({
        userId,
        limit: 1000 // Get all conversations for analysis
      })

      const oldestConv = conversations.length > 0
        ? conversations.reduce((oldest, conv) =>
            conv.startedAt < oldest.startedAt ? conv : oldest
          )
        : null

      const newestConv = conversations.length > 0
        ? conversations.reduce((newest, conv) =>
            conv.startedAt > newest.startedAt ? conv : newest
          )
        : null

      // Estimate database size (very rough)
      const estimatedSize = conversations.length * 0.1 + // ~100KB per conversation
        conversations.reduce((total, conv) => total + (conv.messageCount || 0), 0) * 0.01 // ~10KB per message

      // Calculate cleanup recommendations
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const toArchive = conversations.filter(conv =>
        conv.lastActivityAt < thirtyDaysAgo && conv.isActive
      ).length

      const toDelete = conversations.filter(conv =>
        conv.lastActivityAt < ninetyDaysAgo
      ).length

      return {
        databaseSize: estimatedSize,
        oldestConversation: oldestConv?.startedAt || null,
        newestConversation: newestConv?.startedAt || null,
        orphanedMessages: 0, // Would require complex query
        corruptedEntries: 0, // Would require data validation
        recommendedCleanup: {
          conversationsToArchive: toArchive,
          conversationsToDelete: toDelete,
          estimatedSpaceSaved: (toDelete * 0.1) // Rough estimate
        }
      }
    } catch (error) {
      console.error('Failed to get data health metrics:', error)
      throw new Error('Failed to get data health metrics')
    }
  }

  // Private helper methods
  private async getEmotionDistribution(userId: string): Promise<Record<string, number>> {
    // This would require a more complex query to aggregate emotions from messages
    // For now, return a mock distribution
    return {
      happy: 25,
      excited: 20,
      calm: 18,
      thoughtful: 15,
      playful: 12,
      sad: 10
    }
  }

  private async getMessageTypeDistribution(userId: string): Promise<Record<'text' | 'audio', number>> {
    // Similar to above, would need aggregation query
    return {
      text: 80,
      audio: 20
    }
  }

  private async getMonthlyConversationStats(userId: string): Promise<Array<{ month: string; count: number }>> {
    const conversations = await dataPersistence.getConversations({
      userId,
      limit: 1000
    })

    const monthCounts: Record<string, number> = {}

    conversations.forEach(conv => {
      const month = conv.startedAt.toISOString().substring(0, 7) // YYYY-MM format
      monthCounts[month] = (monthCounts[month] || 0) + 1
    })

    return Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  private async getRecentActivityStats(userId: string): Promise<Array<{ date: string; messages: number; conversations: number }>> {
    const days: Array<{ date: string; messages: number; conversations: number }> = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      // Get conversations for this day
      const conversations = await dataPersistence.getConversations({
        userId,
        dateFrom: date,
        dateTo: new Date(date.getTime() + 24 * 60 * 60 * 1000)
      })

      const totalMessages = conversations.reduce((sum, conv) => sum + (conv.messageCount || 0), 0)

      days.push({
        date: dateStr,
        messages: totalMessages,
        conversations: conversations.length
      })
    }

    return days
  }

  private async getTimePatterns(userId: string): Promise<{ mostActiveHour: number; averageDuration: number }> {
    // This would analyze message timestamps to find patterns
    // For now, return mock data
    return {
      mostActiveHour: 19, // 7 PM
      averageDuration: 15 // 15 minutes average
    }
  }

  private async getPreferredEmotions(userId: string): Promise<string[]> {
    const emotionDist = await this.getEmotionDistribution(userId)
    return Object.entries(emotionDist)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion)
  }

  private async getChattingPattern(userId: string): Promise<'morning' | 'afternoon' | 'evening' | 'night' | 'mixed'> {
    // Would analyze message timestamps
    return 'evening' // Mock data
  }

  private async getAverageSessionLength(userId: string): Promise<number> {
    const conversations = await dataPersistence.getConversations({
      userId,
      limit: 100
    })

    if (conversations.length === 0) return 0

    const totalDuration = conversations.reduce((sum, conv) => {
      if (conv.lastActivityAt && conv.startedAt) {
        const duration = conv.lastActivityAt.getTime() - conv.startedAt.getTime()
        return sum + duration / (1000 * 60) // Convert to minutes
      }
      return sum
    }, 0)

    return Math.round(totalDuration / conversations.length)
  }

  private async getLongestConversation(userId: string): Promise<{
    id: string
    title: string
    messageCount: number
    duration: number
  }> {
    const conversations = await dataPersistence.getConversations({
      userId,
      limit: 1000
    })

    if (conversations.length === 0) {
      return { id: '', title: '', messageCount: 0, duration: 0 }
    }

    const longest = conversations.reduce((max, conv) => {
      const messageCount = conv.messageCount || 0
      return messageCount > (max.messageCount || 0) ? conv : max
    })

    const duration = longest.lastActivityAt && longest.startedAt
      ? (longest.lastActivityAt.getTime() - longest.startedAt.getTime()) / (1000 * 60)
      : 0

    return {
      id: longest.id,
      title: longest.title,
      messageCount: longest.messageCount || 0,
      duration: Math.round(duration)
    }
  }

  private async getEngagementTrend(userId: string): Promise<'increasing' | 'decreasing' | 'stable'> {
    const recentActivity = await this.getRecentActivityStats(userId)

    if (recentActivity.length < 2) return 'stable'

    const firstHalf = recentActivity.slice(0, 3)
    const secondHalf = recentActivity.slice(-3)

    const firstAvg = firstHalf.reduce((sum, day) => sum + day.messages, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, day) => sum + day.messages, 0) / secondHalf.length

    const threshold = 0.2 // 20% change threshold

    if (secondAvg > firstAvg * (1 + threshold)) return 'increasing'
    if (secondAvg < firstAvg * (1 - threshold)) return 'decreasing'
    return 'stable'
  }

  private async extractTopTopics(userId: string): Promise<string[]> {
    const conversations = await dataPersistence.getConversations({
      userId,
      limit: 100
    })

    // Extract keywords from conversation titles
    const keywords: Record<string, number> = {}

    conversations.forEach(conv => {
      const words = conv.title
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && !['conversation', 'chat', 'talk'].includes(word))

      words.forEach(word => {
        keywords[word] = (keywords[word] || 0) + 1
      })
    })

    return Object.entries(keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic)
  }

  // Privacy and Data Management
  async getPrivacyOptions(userId: string) {
    return {
      autoDelete: {
        enabled: false,
        daysToKeep: 365,
        lastCleanup: null
      },
      dataExportOptions: {
        formats: ['json', 'markdown', 'txt'],
        includeMetadata: true,
        includeAudio: true
      },
      storageOptions: {
        localOnly: true,
        cloudBackup: false,
        encryption: true
      }
    }
  }

  async updatePrivacySettings(userId: string, settings: any) {
    // This would update user preferences in the database
    console.log(`Updating privacy settings for user ${userId}:`, settings)
    return settings
  }

  async scheduleDataCleanup(userId: string, options: {
    archiveAfterDays: number
    deleteAfterDays: number
    keepExported: boolean
  }) {
    try {
      let archivedCount = 0
      let deletedCount = 0

      if (options.archiveAfterDays > 0) {
        archivedCount = await dataPersistence.archiveOldConversations(userId, options.archiveAfterDays)
      }

      if (options.deleteAfterDays > 0) {
        deletedCount = await dataPersistence.deleteOldConversations(userId, options.deleteAfterDays)
      }

      // Invalidate all caches for this user
      cache.invalidateUserConversations(userId)
      cache.invalidateStats(userId)

      return {
        success: true,
        archivedConversations: archivedCount,
        deletedConversations: deletedCount,
        cleanupDate: new Date()
      }
    } catch (error) {
      console.error('Failed to schedule data cleanup:', error)
      throw new Error('Failed to schedule data cleanup')
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService()