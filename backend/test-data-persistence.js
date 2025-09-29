#!/usr/bin/env node

/**
 * Test script for data persistence functionality
 * Run with: node test-data-persistence.js
 */

const BASE_URL = 'http://localhost:8000'

const testUserId = 'test-user-123'

// Test functions
async function testCreateConversation() {
  console.log('\n🧪 Testing conversation creation...')

  const response = await fetch(`${BASE_URL}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: testUserId,
      title: 'Test Conversation',
      metadata: JSON.stringify({ test: true })
    })
  })

  const result = await response.json()

  if (result.success && result.data) {
    console.log('✅ Conversation created:', result.data.id)
    return result.data.id
  } else {
    console.error('❌ Failed to create conversation:', result.error)
    return null
  }
}

async function testAddMessage(conversationId) {
  console.log('\n🧪 Testing message addition...')

  const response = await fetch(`${BASE_URL}/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'Hello, this is a test message!',
      sender: 'user',
      type: 'text',
      emotion: 'happy'
    })
  })

  const result = await response.json()

  if (result.success) {
    console.log('✅ Message added:', result.data.id)
    return result.data.id
  } else {
    console.error('❌ Failed to add message:', result.error)
    return null
  }
}

async function testGetConversations() {
  console.log('\n🧪 Testing conversation retrieval...')

  const response = await fetch(`${BASE_URL}/api/conversations?userId=${testUserId}`)
  const result = await response.json()

  if (result.success) {
    console.log(`✅ Retrieved ${result.data.length} conversations`)
    return result.data
  } else {
    console.error('❌ Failed to get conversations:', result.error)
    return []
  }
}

async function testSearchConversations() {
  console.log('\n🧪 Testing conversation search...')

  const response = await fetch(`${BASE_URL}/api/conversations/search?userId=${testUserId}&q=test`)
  const result = await response.json()

  if (result.success) {
    console.log(`✅ Search found ${result.data.length} conversations`)
    return result.data
  } else {
    console.error('❌ Failed to search conversations:', result.error)
    return []
  }
}

async function testExportConversation(conversationId) {
  console.log('\n🧪 Testing conversation export...')

  const formats = ['json', 'markdown', 'txt']

  for (const format of formats) {
    try {
      const response = await fetch(`${BASE_URL}/api/conversations/${conversationId}/export?format=${format}`)

      if (response.ok) {
        const content = await response.text()
        console.log(`✅ Export ${format.toUpperCase()}: ${content.length} characters`)
      } else {
        console.error(`❌ Failed to export as ${format}`)
      }
    } catch (error) {
      console.error(`❌ Export ${format} error:`, error.message)
    }
  }
}

async function testAnalytics() {
  console.log('\n🧪 Testing analytics...')

  try {
    // Test stats
    const statsResponse = await fetch(`${BASE_URL}/api/analytics/stats/${testUserId}`)
    const statsResult = await statsResponse.json()

    if (statsResult.success) {
      console.log('✅ Analytics stats:', statsResult.data.totalConversations, 'conversations')
    } else {
      console.error('❌ Failed to get analytics stats')
    }

    // Test insights
    const insightsResponse = await fetch(`${BASE_URL}/api/analytics/insights/${testUserId}`)
    const insightsResult = await insightsResponse.json()

    if (insightsResult.success) {
      console.log('✅ Analytics insights:', insightsResult.data.chattingPattern, 'pattern')
    } else {
      console.error('❌ Failed to get analytics insights')
    }

    // Test dashboard
    const dashboardResponse = await fetch(`${BASE_URL}/api/analytics/dashboard/${testUserId}`)
    const dashboardResult = await dashboardResponse.json()

    if (dashboardResult.success) {
      console.log('✅ Analytics dashboard loaded successfully')
    } else {
      console.error('❌ Failed to get analytics dashboard')
    }
  } catch (error) {
    console.error('❌ Analytics test error:', error.message)
  }
}

async function testSystemHealth() {
  console.log('\n🧪 Testing system health...')

  try {
    const response = await fetch(`${BASE_URL}/api/system/status`)
    const result = await response.json()

    if (result.success) {
      console.log('✅ System status:')
      console.log('  - Server:', result.data.server.status)
      console.log('  - Background Tasks:', result.data.backgroundTasks.isRunning ? 'running' : 'stopped')
      console.log('  - Cache:', result.data.cache.entries, 'entries')
      console.log('  - Database:', result.data.database.status)
    } else {
      console.error('❌ Failed to get system status')
    }
  } catch (error) {
    console.error('❌ System health test error:', error.message)
  }
}

async function runTests() {
  console.log('🚀 Starting Data Persistence Tests')
  console.log('===================================')

  try {
    // Test basic health
    const healthResponse = await fetch(`${BASE_URL}/health`)
    if (!healthResponse.ok) {
      throw new Error('Server is not responding')
    }
    console.log('✅ Server is healthy')

    // Run tests in sequence
    const conversationId = await testCreateConversation()

    if (conversationId) {
      await testAddMessage(conversationId)
      await testGetConversations()
      await testSearchConversations()
      await testExportConversation(conversationId)
    }

    await testAnalytics()
    await testSystemHealth()

    console.log('\n🎉 All tests completed!')

  } catch (error) {
    console.error('\n💥 Test failed:', error.message)
    console.log('\nMake sure the server is running: cd backend && npm run dev')
  }
}

// Add some AI response simulation
async function testAIConversation(conversationId) {
  console.log('\n🧪 Testing AI conversation flow...')

  const messages = [
    { content: 'Hello! How are you today?', sender: 'user', emotion: 'happy' },
    { content: 'I\'m doing great! Thanks for asking. How can I help you?', sender: 'ai', emotion: 'cheerful' },
    { content: 'Can you tell me a joke?', sender: 'user', emotion: 'playful' },
    { content: 'Why don\'t scientists trust atoms? Because they make up everything!', sender: 'ai', emotion: 'playful' }
  ]

  for (const message of messages) {
    await fetch(`${BASE_URL}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    })

    // Small delay to simulate natural conversation
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('✅ AI conversation simulation completed')
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
}

module.exports = { runTests }