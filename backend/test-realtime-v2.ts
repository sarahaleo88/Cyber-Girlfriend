/**
 * Test script for OpenAI Realtime API V2 implementation
 * 
 * This tests the new session-based approach:
 * 1. Create session via REST API
 * 2. Connect WebSocket with ephemeral key
 * 3. Test bidirectional communication
 */

import { WebSocket } from 'ws';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env') });

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

function logTest(test: string, status: 'PASS' | 'FAIL', message: string, duration?: number) {
  const emoji = status === 'PASS' ? '✅' : '❌';
  console.log(`${emoji} ${test}: ${message}${duration ? ` (${duration}ms)` : ''}`);
  results.push({ test, status, message, duration });
}

async function createRealtimeSession(): Promise<{ sessionId: string; ephemeralKey: string } | null> {
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    logTest('Create Session', 'FAIL', 'No API key found');
    return null;
  }

  try {
    console.log('🔑 Creating Realtime session...');

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse',
        instructions: 'You are a helpful AI assistant for testing.',
        modalities: ['text', 'audio'],
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logTest('Create Session', 'FAIL', `${response.status}: ${errorText}`, Date.now() - startTime);
      return null;
    }

    const session = await response.json();
    logTest('Create Session', 'PASS', `Session ${session.id} created`, Date.now() - startTime);
    
    console.log(`   Model: ${session.model}`);
    console.log(`   Voice: ${session.voice}`);
    console.log(`   Ephemeral key: ${session.client_secret.value.substring(0, 20)}...`);
    console.log(`   Expires: ${new Date(session.client_secret.expires_at * 1000).toISOString()}`);

    return {
      sessionId: session.id,
      ephemeralKey: session.client_secret.value,
    };
  } catch (error) {
    logTest('Create Session', 'FAIL', `Error: ${error}`, Date.now() - startTime);
    return null;
  }
}

async function testWebSocketConnection(ephemeralKey: string): Promise<boolean> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    console.log('\n🔗 Testing WebSocket connection...');

    const ws = new WebSocket('wss://api.openai.com/v1/realtime', {
      headers: {
        'Authorization': `Bearer ${ephemeralKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    const timeout = setTimeout(() => {
      logTest('WebSocket Connection', 'FAIL', 'Connection timeout (15s)', Date.now() - startTime);
      ws.close();
      resolve(false);
    }, 15000);

    let sessionUpdated = false;

    ws.on('open', () => {
      console.log('✅ WebSocket connected!');
      
      // Send session.update
      const sessionUpdate = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful assistant.',
          voice: 'verse',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          turn_detection: {
            type: 'server_vad',
          },
        },
      };

      console.log('📤 Sending session.update...');
      ws.send(JSON.stringify(sessionUpdate));
    });

    ws.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        console.log(`📨 Received: ${event.type}`);

        if (event.type === 'session.created') {
          console.log('   ✅ Session created event received');
        }

        if (event.type === 'session.updated') {
          sessionUpdated = true;
          console.log('   ✅ Session updated successfully!');
          logTest('WebSocket Connection', 'PASS', 'Connected and session updated', Date.now() - startTime);
          
          // Test sending a text message
          console.log('\n📤 Testing response.create...');
          const responseCreate = {
            type: 'response.create',
            response: {
              modalities: ['text'],
              instructions: 'Say "Hello, this is a test response."',
            },
          };
          ws.send(JSON.stringify(responseCreate));
        }

        if (event.type === 'response.done') {
          console.log('   ✅ Response completed!');
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }

        if (event.type === 'error') {
          console.log(`   ❌ Error: ${event.error?.message}`);
          logTest('WebSocket Connection', 'FAIL', `Error: ${event.error?.message}`, Date.now() - startTime);
          clearTimeout(timeout);
          ws.close();
          resolve(false);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    ws.on('error', (error) => {
      logTest('WebSocket Connection', 'FAIL', `Error: ${error.message}`, Date.now() - startTime);
      clearTimeout(timeout);
      resolve(false);
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 Connection closed: ${code} ${reason.toString()}`);
      clearTimeout(timeout);
      
      if (!sessionUpdated && code !== 1000) {
        logTest('WebSocket Connection', 'FAIL', `Closed before session update: ${code}`, Date.now() - startTime);
        resolve(false);
      }
    });
  });
}

async function runTests() {
  console.log('\n🧪 OpenAI Realtime API V2 Test Suite\n');
  console.log('='.repeat(60));
  console.log('\n');

  const totalStartTime = Date.now();

  // Test 1: Create session
  console.log('📋 Test 1: Create Realtime Session');
  const sessionData = await createRealtimeSession();
  console.log('');

  if (!sessionData) {
    console.log('❌ Cannot proceed without session\n');
    printSummary(Date.now() - totalStartTime);
    return;
  }

  // Test 2: WebSocket connection
  console.log('📋 Test 2: WebSocket Connection with Ephemeral Key');
  const success = await testWebSocketConnection(sessionData.ephemeralKey);
  console.log('');

  printSummary(Date.now() - totalStartTime);

  if (success) {
    console.log('\n🎉 SUCCESS! The new implementation works correctly!\n');
    console.log('Next steps:');
    console.log('1. Update backend/src/routes/websocket.ts to use OpenAIRealtimeProxyV2');
    console.log('2. Restart the development servers');
    console.log('3. Test with the frontend application');
    console.log('');
  }
}

function printSummary(totalDuration: number) {
  console.log('='.repeat(60));
  console.log('\n📊 Test Summary\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️ Total Duration: ${totalDuration}ms`);
  console.log('');
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

