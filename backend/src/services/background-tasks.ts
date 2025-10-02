import { cache } from './cache'
import { dataPersistence } from './data-persistence'

export class BackgroundTaskService {
  private cacheCleanupInterval?: NodeJS.Timeout
  private dataMaintenanceInterval?: NodeJS.Timeout
  private isRunning = false

  start(): void {
    if (this.isRunning) {
      console.log('Background tasks are already running')
      return
    }

    this.isRunning = true
    console.log('🔄 Starting background tasks...')

    // Start cache cleanup every 10 minutes
    this.cacheCleanupInterval = cache.startCleanupInterval(10)

    // Start data maintenance every hour
    this.dataMaintenanceInterval = setInterval(() => {
      this.performDataMaintenance()
    }, 60 * 60 * 1000) // 1 hour

    console.log('✅ Background tasks started successfully')
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('Background tasks are not running')
      return
    }

    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval)
      this.cacheCleanupInterval = undefined
    }

    if (this.dataMaintenanceInterval) {
      clearInterval(this.dataMaintenanceInterval)
      this.dataMaintenanceInterval = undefined
    }

    this.isRunning = false
    console.log('🛑 Background tasks stopped')
  }

  private async performDataMaintenance(): Promise<void> {
    try {
      console.log('🧹 Performing data maintenance...')

      // Log cache statistics
      const cacheStats = cache.getStats()
      const cacheSize = cache.getSize()

      console.log(`Cache stats: ${cacheStats.hits} hits, ${cacheStats.misses} misses, ${cacheStats.hitRate}% hit rate`)
      console.log(`Cache size: ${cacheSize.entries} entries, ~${cacheSize.estimatedMemoryMB}MB`)

      // Clean up expired cache entries
      const removedCacheEntries = cache.cleanup()
      if (removedCacheEntries > 0) {
        console.log(`Cleaned up ${removedCacheEntries} expired cache entries`)
      }

      // Additional maintenance tasks can be added here
      // - Database optimization
      // - Log rotation
      // - Performance metrics collection
      // - Health checks

      console.log('✅ Data maintenance completed')
    } catch (error) {
      console.error('❌ Data maintenance failed:', error)
    }
  }

  // Manual cleanup methods
  async performFullMaintenance(): Promise<{
    cacheCleanup: number
    maintenanceCompleted: Date
  }> {
    console.log('🔧 Performing full maintenance...')

    // Clean up cache
    const removedCacheEntries = cache.cleanup()

    // Perform data maintenance
    await this.performDataMaintenance()

    return {
      cacheCleanup: removedCacheEntries,
      maintenanceCompleted: new Date()
    }
  }

  getCacheStatistics() {
    return {
      ...cache.getStats(),
      ...cache.getSize()
    }
  }

  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      cacheCleanupActive: !!this.cacheCleanupInterval,
      dataMaintenanceActive: !!this.dataMaintenanceInterval,
      uptime: this.isRunning ? 'Active' : 'Stopped'
    }
  }

  // User-specific maintenance
  async performUserDataCleanup(userId: string, options: {
    clearCache?: boolean
    archiveOldConversations?: boolean
    archiveAfterDays?: number
  }): Promise<{
    cacheCleared: boolean
    conversationsArchived: number
  }> {
    let cacheCleared = false
    let conversationsArchived = 0

    if (options.clearCache) {
      cache.invalidateUserConversations(userId)
      cache.invalidateSearchResults(userId)
      cache.invalidateStats(userId)
      cacheCleared = true
    }

    if (options.archiveOldConversations && options.archiveAfterDays) {
      conversationsArchived = await dataPersistence.archiveOldConversations(
        userId,
        options.archiveAfterDays
      )
    }

    return {
      cacheCleared,
      conversationsArchived
    }
  }
}

// Export singleton instance
export const backgroundTasks = new BackgroundTaskService()