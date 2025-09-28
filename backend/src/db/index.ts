import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Database connection
const sqlite = new Database(path.join(dataDir, 'cyber-girlfriend.db'))
sqlite.pragma('journal_mode = WAL')

// Create Drizzle database instance
export const db = drizzle(sqlite, { schema })

// Run migrations
export function runMigrations() {
  try {
    const migrationsFolder = path.join(process.cwd(), 'drizzle')
    if (fs.existsSync(migrationsFolder)) {
      migrate(db, { migrationsFolder })
      console.log('✅ Database migrations completed')
    } else {
      console.log('ℹ️ No migrations folder found, skipping migrations')
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Database health check
export function checkDatabaseHealth() {
  try {
    const result = sqlite.prepare('SELECT 1 as health').get()
    return result?.health === 1
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Graceful shutdown
export function closeDatabase() {
  try {
    sqlite.close()
    console.log('Database connection closed')
  } catch (error) {
    console.error('Error closing database:', error)
  }
}

// Initialize database
export function initializeDatabase() {
  console.log('🗄️ Initializing database...')

  if (!checkDatabaseHealth()) {
    throw new Error('Database health check failed')
  }

  runMigrations()
  console.log('✅ Database initialized successfully')
}

// Export schema for use in other files
export { schema }