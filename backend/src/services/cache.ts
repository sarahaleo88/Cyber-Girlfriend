import type { Conversation, Message } from '../db/schema'
import type { ConversationWithStats } from './data-persistence'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // time to live in milliseconds
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>()
  private stats = {
    hits: 0,
    misses: 0
  }

  // Default TTL values (in milliseconds)
  private readonly DEFAULT_TTL = {
    conversation: 5 * 60 * 1000, // 5 minutes
    messages: 2 * 60 * 1000,     // 2 minutes
    search: 1 * 60 * 1000,       // 1 minute
    stats: 10 * 60 * 1000,       // 10 minutes
  }

  // Cache key generators
  private getConversationKey(id: string): string {
    return `conv:${id}`
  }

  private getConversationWithStatsKey(id: string): string {
    return `conv_stats:${id}`
  }

  private getMessagesKey(conversationId: string, offset?: number, limit?: number): string {
    return `msgs:${conversationId}:${offset || 0}:${limit || 100}`
  }

  private getConversationsKey(userId: string, filters?: any): string {
    const filterKey = filters ? JSON.stringify(filters) : 'default'
    return `convs:${userId}:${filterKey}`
  }

  private getSearchKey(userId: string, query: string, limit?: number): string {
    return `search:${userId}:${query}:${limit || 20}`
  }

  private getStatsKey(userId: string): string {
    return `stats:${userId}`
  }

  // Generic cache operations
  private set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL.conversation
    }
    this.cache.set(key, entry)
  }

  private get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return entry.data as T
  }

  private delete(key: string): void {
    this.cache.delete(key)
  }

  private deleteByPattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'))
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  // Conversation caching
  cacheConversation(conversation: Conversation): void {
    const key = this.getConversationKey(conversation.id)
    this.set(key, conversation, this.DEFAULT_TTL.conversation)
  }

  getCachedConversation(id: string): Conversation | null {
    const key = this.getConversationKey(id)
    return this.get<Conversation>(key)
  }

  invalidateConversation(id: string): void {
    const key = this.getConversationKey(id)
    this.delete(key)

    // Also invalidate conversation with stats
    const statsKey = this.getConversationWithStatsKey(id)
    this.delete(statsKey)

    // Invalidate related messages cache
    this.deleteByPattern(`msgs:${id}:*`)
  }

  // Conversation with stats caching
  cacheConversationWithStats(conversation: ConversationWithStats): void {
    const key = this.getConversationWithStatsKey(conversation.id)
    this.set(key, conversation, this.DEFAULT_TTL.conversation)
  }

  getCachedConversationWithStats(id: string): ConversationWithStats | null {
    const key = this.getConversationWithStatsKey(id)
    return this.get<ConversationWithStats>(key)
  }

  // Messages caching
  cacheMessages(conversationId: string, messages: Message[], offset?: number, limit?: number): void {
    const key = this.getMessagesKey(conversationId, offset, limit)
    this.set(key, messages, this.DEFAULT_TTL.messages)
  }

  getCachedMessages(conversationId: string, offset?: number, limit?: number): Message[] | null {
    const key = this.getMessagesKey(conversationId, offset, limit)
    return this.get<Message[]>(key)
  }

  invalidateMessages(conversationId: string): void {
    this.deleteByPattern(`msgs:${conversationId}:*`)
  }

  // Conversations list caching
  cacheConversations(userId: string, conversations: ConversationWithStats[], filters?: any): void {
    const key = this.getConversationsKey(userId, filters)
    this.set(key, conversations, this.DEFAULT_TTL.conversation)
  }

  getCachedConversations(userId: string, filters?: any): ConversationWithStats[] | null {
    const key = this.getConversationsKey(userId, filters)
    return this.get<ConversationWithStats[]>(key)
  }

  invalidateUserConversations(userId: string): void {
    this.deleteByPattern(`convs:${userId}:*`)
  }

  // Search results caching
  cacheSearchResults(userId: string, query: string, results: ConversationWithStats[], limit?: number): void {
    const key = this.getSearchKey(userId, query, limit)
    this.set(key, results, this.DEFAULT_TTL.search)
  }

  getCachedSearchResults(userId: string, query: string, limit?: number): ConversationWithStats[] | null {
    const key = this.getSearchKey(userId, query, limit)
    return this.get<ConversationWithStats[]>(key)
  }

  invalidateSearchResults(userId: string): void {
    this.deleteByPattern(`search:${userId}:*`)
  }

  // Statistics caching
  cacheStats(userId: string, stats: any): void {
    const key = this.getStatsKey(userId)
    this.set(key, stats, this.DEFAULT_TTL.stats)
  }

  getCachedStats(userId: string): any | null {
    const key = this.getStatsKey(userId)
    return this.get<any>(key)
  }

  invalidateStats(userId: string): void {
    const key = this.getStatsKey(userId)
    this.delete(key)
  }

  // Message-specific operations
  invalidateOnNewMessage(conversationId: string, userId: string): void {
    // Invalidate conversation stats
    this.invalidateConversation(conversationId)

    // Invalidate messages cache for this conversation
    this.invalidateMessages(conversationId)

    // Invalidate user's conversations list
    this.invalidateUserConversations(userId)

    // Invalidate search results
    this.invalidateSearchResults(userId)

    // Invalidate user stats
    this.invalidateStats(userId)
  }

  invalidateOnConversationUpdate(conversationId: string, userId: string): void {
    // Similar to new message but without invalidating message cache
    this.invalidateConversation(conversationId)
    this.invalidateUserConversations(userId)
    this.invalidateSearchResults(userId)
  }

  invalidateOnConversationDelete(conversationId: string, userId: string): void {
    // Complete cleanup for deleted conversation
    this.invalidateConversation(conversationId)
    this.invalidateMessages(conversationId)
    this.invalidateUserConversations(userId)
    this.invalidateSearchResults(userId)
    this.invalidateStats(userId)
  }

  // Cache management
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100
    }
  }

  clearStats(): void {
    this.stats.hits = 0
    this.stats.misses = 0
  }

  clearCache(): void {
    this.cache.clear()
    this.clearStats()
  }

  // Background cleanup for expired entries
  cleanup(): number {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }

    return removedCount
  }

  // Get cache size and memory usage estimate
  getSize(): { entries: number; estimatedMemoryMB: number } {
    const entries = this.cache.size

    // Rough estimate: each entry is about 1KB on average
    const estimatedMemoryMB = (entries * 1024) / (1024 * 1024)

    return {
      entries,
      estimatedMemoryMB: Math.round(estimatedMemoryMB * 100) / 100
    }
  }

  // Preload commonly accessed data
  async preloadUserData(userId: string, conversationIds: string[]): Promise<void> {
    // This would typically involve calling the data persistence service
    // and caching the most commonly accessed conversations and recent messages
    console.log(`Preloading data for user ${userId} with ${conversationIds.length} conversations`)

    // Implementation would involve:
    // 1. Load recent conversations
    // 2. Load recent messages for active conversations
    // 3. Cache user stats
    // This is a placeholder for future implementation
  }

  // Start background cleanup interval
  startCleanupInterval(intervalMinutes: number = 10): NodeJS.Timeout {
    return setInterval(() => {
      const removed = this.cleanup()
      if (removed > 0) {
        console.log(`Cache cleanup: removed ${removed} expired entries`)
      }
    }, intervalMinutes * 60 * 1000)
  }
}

// Export singleton instance
export const cache = new CacheService()