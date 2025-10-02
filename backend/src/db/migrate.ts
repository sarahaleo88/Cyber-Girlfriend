#!/usr/bin/env bun

import { initializeDatabase } from './index'

// Run database migrations
async function main() {
  try {
    console.log('Starting database migration...')
    initializeDatabase()
    console.log('✅ Migration completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  main()
}