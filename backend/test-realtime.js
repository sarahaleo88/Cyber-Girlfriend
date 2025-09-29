#!/usr/bin/env node

/**
 * Test script for OpenAI Realtime API integration
 * This script tests the WebSocket proxy server and audio streaming functionality
 */

const WebSocket = require('ws');

class RealtimeAPITest {
  constructor() {
    this.ws = null;
    this.sessionId = null;
    this.connected = false;
  }

  async testConnection() {
    console.log('🧪 Testing OpenAI Realtime API Integration');
    console.log('================================================');

    try {
      // Test 1: Basic server health check
      await this.testHealthCheck();

      // Test 2: WebSocket connection
      await this.testWebSocketConnection();

      // Test 3: Authentication
      await this.testAuthentication();

      // Test 4: Start realtime session
      await this.testStartRealtime();

      // Test 5: Send text message
      await this.testTextMessage();

      // Test 6: Check session status
      await this.testSessionStatus();

      console.log('\n✅ All tests passed!');
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    } finally {
      if (this.ws) {
        this.ws.close();
      }
    }
  }

  async testHealthCheck() {
    console.log('\n1. Testing server health check...');

    try {
      const response = await fetch('http://localhost:8000/health');
      const data = await response.json();

      if (response.ok && data.status === 'ok') {
        console.log('   ✅ Server is healthy');
      } else {
        throw new Error('Server health check failed');
      }
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  async testWebSocketConnection() {
    console.log('\n2. Testing WebSocket connection...');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://localhost:8001');

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        console.log('   ✅ WebSocket connected');
        this.connected = true;
        resolve();
      });

      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`   📨 Received: ${message.type}`);
        } catch (error) {
          console.error('   ⚠️ Failed to parse message:', error);
        }
      });
    });
  }

  async testAuthentication() {
    console.log('\n3. Testing authentication...');

    if (!this.connected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);

      const messageHandler = (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'status' && message.data.status === 'authenticated') {
            clearTimeout(timeout);
            this.ws.off('message', messageHandler);
            console.log('   ✅ Authentication successful');
            resolve();
          } else if (message.type === 'error') {
            clearTimeout(timeout);
            this.ws.off('message', messageHandler);
            reject(new Error(`Authentication failed: ${message.data.error}`));
          }
        } catch (error) {
          // Ignore parse errors for other messages
        }
      };

      this.ws.on('message', messageHandler);

      this.ws.send(JSON.stringify({
        type: 'auth',
        data: {
          userId: 'test-user-123',
          conversationId: 'test-conversation-456'
        }
      }));
    });
  }

  async testStartRealtime() {
    console.log('\n4. Testing realtime session start...');

    if (!process.env.OPENAI_API_KEY) {
      console.log('   ⚠️ OPENAI_API_KEY not set, expecting mock behavior');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Realtime session start timeout'));
      }, 10000);

      const messageHandler = (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'realtime_started') {
            clearTimeout(timeout);
            this.ws.off('message', messageHandler);
            this.sessionId = message.data.sessionId;
            console.log(`   ✅ Realtime session started: ${this.sessionId}`);
            resolve();
          } else if (message.type === 'error') {
            clearTimeout(timeout);
            this.ws.off('message', messageHandler);

            // If no API key, this is expected
            if (message.data.error.includes('OPENAI_API_KEY')) {
              console.log('   ⚠️ No OpenAI API key - expected behavior');
              resolve();
            } else {
              reject(new Error(`Realtime session failed: ${message.data.error}`));
            }
          }
        } catch (error) {
          // Ignore parse errors for other messages
        }
      };

      this.ws.on('message', messageHandler);

      this.ws.send(JSON.stringify({
        type: 'start_realtime',
        data: {
          personalityTraits: {
            playfulness: 80,
            empathy: 90,
            humor: 70,
            intelligence: 85,
            supportiveness: 95
          },
          voiceSettings: {
            voice: 'nova',
            speed: 1.0,
            pitch: 1.0,
            volume: 1.0
          }
        }
      }));
    });
  }

  async testTextMessage() {
    console.log('\n5. Testing text message...');

    if (!this.sessionId) {
      console.log('   ⚠️ No session ID, skipping text message test');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      // For this test, we'll just send a message and wait a moment
      // In a real implementation, we would wait for a response

      this.ws.send(JSON.stringify({
        type: 'text',
        data: {
          text: 'Hello! This is a test message.'
        }
      }));

      console.log('   ✅ Text message sent');

      // Give some time for potential responses
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }

  async testSessionStatus() {
    console.log('\n6. Testing session status endpoint...');

    try {
      const response = await fetch('http://localhost:8000/api/realtime/metrics');
      const data = await response.json();

      if (response.ok && data.success) {
        console.log('   ✅ Session metrics retrieved');
        console.log(`   📊 Active sessions: ${data.data.activeSessions}`);
        console.log(`   📊 Total sessions: ${data.data.totalSessions}`);
      } else {
        throw new Error('Failed to retrieve session metrics');
      }
    } catch (error) {
      throw new Error(`Session status test failed: ${error.message}`);
    }
  }
}

// Helper function to check if server is running
async function checkServerRunning() {
  try {
    const response = await fetch('http://localhost:8000/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if server is running...');

  const serverRunning = await checkServerRunning();
  if (!serverRunning) {
    console.error('❌ Server is not running. Please start the server first:');
    console.error('   cd backend && bun run dev');
    process.exit(1);
  }

  const test = new RealtimeAPITest();
  await test.testConnection();
}

// Run the test if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = RealtimeAPITest;