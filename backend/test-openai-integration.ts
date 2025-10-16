/**
 * OpenAI Realtime API Integration Test
 * 
 * This script tests the OpenAI Realtime API integration without requiring browser interaction.
 * It verifies:
 * 1. API key configuration
 * 2. WebSocket connection to OpenAI
 * 3. Session initialization
 * 4. Audio data flow simulation
 * 5. Error handling
 */

import { WebSocket } from 'ws';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env') });

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

function logTest(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, duration?: number) {
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${emoji} ${test}: ${message}${duration ? ` (${duration}ms)` : ''}`);
  results.push({ test, status, message, duration });
}

async function testAPIKeyConfiguration(): Promise<boolean> {
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    logTest('API Key Configuration', 'FAIL', 'OPENAI_API_KEY not found in environment', Date.now() - startTime);
    return false;
  }
  
  if (apiKey === 'your_openai_api_key_here') {
    logTest('API Key Configuration', 'FAIL', 'API key is still placeholder value', Date.now() - startTime);
    return false;
  }
  
  if (!apiKey.startsWith('sk-')) {
    logTest('API Key Configuration', 'FAIL', 'API key format invalid (should start with sk-)', Date.now() - startTime);
    return false;
  }
  
  logTest('API Key Configuration', 'PASS', `API key loaded (${apiKey.substring(0, 10)}...)`, Date.now() - startTime);
  return true;
}

async function testOpenAIConnection(): Promise<boolean> {
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    logTest('OpenAI Connection', 'SKIP', 'No API key available');
    return false;
  }
  
  return new Promise((resolve) => {
    const wsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
    
    console.log('🔗 Attempting to connect to OpenAI Realtime API...');
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });
    
    const timeout = setTimeout(() => {
      ws.close();
      logTest('OpenAI Connection', 'FAIL', 'Connection timeout (10s)', Date.now() - startTime);
      resolve(false);
    }, 10000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      logTest('OpenAI Connection', 'PASS', 'Successfully connected to OpenAI Realtime API', Date.now() - startTime);
      ws.close();
      resolve(true);
    });
    
    ws.on('error', (error: Error) => {
      clearTimeout(timeout);
      logTest('OpenAI Connection', 'FAIL', `Connection error: ${error.message}`, Date.now() - startTime);
      resolve(false);
    });
    
    ws.on('close', (code, reason) => {
      if (code !== 1000) {
        console.log(`⚠️ Connection closed with code ${code}: ${reason.toString()}`);
      }
    });
  });
}

async function testSessionInitialization(): Promise<boolean> {
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    logTest('Session Initialization', 'SKIP', 'No API key available');
    return false;
  }
  
  return new Promise((resolve) => {
    const wsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });
    
    const timeout = setTimeout(() => {
      ws.close();
      logTest('Session Initialization', 'FAIL', 'Session initialization timeout', Date.now() - startTime);
      resolve(false);
    }, 15000);
    
    let sessionCreated = false;
    
    ws.on('open', () => {
      console.log('🔗 Connected, initializing session...');
      
      // Send session.update event
      const sessionUpdate = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful AI assistant.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          }
        }
      };
      
      ws.send(JSON.stringify(sessionUpdate));
    });
    
    ws.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        console.log(`📨 Received event: ${event.type}`);
        
        if (event.type === 'session.created' || event.type === 'session.updated') {
          sessionCreated = true;
          clearTimeout(timeout);
          logTest('Session Initialization', 'PASS', `Session initialized (event: ${event.type})`, Date.now() - startTime);
          ws.close();
          resolve(true);
        }
        
        if (event.type === 'error') {
          clearTimeout(timeout);
          logTest('Session Initialization', 'FAIL', `Error: ${event.error?.message || 'Unknown error'}`, Date.now() - startTime);
          ws.close();
          resolve(false);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });
    
    ws.on('error', (error: Error) => {
      clearTimeout(timeout);
      logTest('Session Initialization', 'FAIL', `Error: ${error.message}`, Date.now() - startTime);
      resolve(false);
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
      if (!sessionCreated) {
        logTest('Session Initialization', 'FAIL', 'Connection closed before session created', Date.now() - startTime);
        resolve(false);
      }
    });
  });
}

async function testAudioDataFlow(): Promise<boolean> {
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    logTest('Audio Data Flow', 'SKIP', 'No API key available');
    return false;
  }
  
  return new Promise((resolve) => {
    const wsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });
    
    const timeout = setTimeout(() => {
      ws.close();
      logTest('Audio Data Flow', 'FAIL', 'Audio flow test timeout', Date.now() - startTime);
      resolve(false);
    }, 20000);
    
    let audioReceived = false;
    
    ws.on('open', () => {
      console.log('🔗 Connected, testing audio flow...');
      
      // Initialize session
      const sessionUpdate = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'Say hello.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
        }
      };
      
      ws.send(JSON.stringify(sessionUpdate));
      
      // Wait a bit then send a text message to trigger audio response
      setTimeout(() => {
        const responseCreate = {
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
            instructions: 'Say "Hello, this is a test."'
          }
        };
        ws.send(JSON.stringify(responseCreate));
      }, 2000);
    });
    
    ws.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        console.log(`📨 Received event: ${event.type}`);
        
        if (event.type === 'response.audio.delta' || event.type === 'response.audio_transcript.delta') {
          audioReceived = true;
          clearTimeout(timeout);
          logTest('Audio Data Flow', 'PASS', 'Audio data received from OpenAI', Date.now() - startTime);
          ws.close();
          resolve(true);
        }
        
        if (event.type === 'response.done') {
          clearTimeout(timeout);
          if (audioReceived) {
            logTest('Audio Data Flow', 'PASS', 'Audio response completed', Date.now() - startTime);
          } else {
            logTest('Audio Data Flow', 'FAIL', 'Response completed but no audio received', Date.now() - startTime);
          }
          ws.close();
          resolve(audioReceived);
        }
        
        if (event.type === 'error') {
          clearTimeout(timeout);
          logTest('Audio Data Flow', 'FAIL', `Error: ${event.error?.message || 'Unknown error'}`, Date.now() - startTime);
          ws.close();
          resolve(false);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });
    
    ws.on('error', (error: Error) => {
      clearTimeout(timeout);
      logTest('Audio Data Flow', 'FAIL', `Error: ${error.message}`, Date.now() - startTime);
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('\n🧪 OpenAI Realtime API Integration Test Suite\n');
  console.log('='.repeat(60));
  console.log('\n');
  
  const totalStartTime = Date.now();
  
  // Test 1: API Key Configuration
  console.log('📋 Test 1: API Key Configuration');
  const apiKeyOk = await testAPIKeyConfiguration();
  console.log('');
  
  if (!apiKeyOk) {
    console.log('⚠️ Skipping remaining tests due to API key configuration failure\n');
    printSummary(Date.now() - totalStartTime);
    return;
  }
  
  // Test 2: OpenAI Connection
  console.log('📋 Test 2: OpenAI Connection');
  const connectionOk = await testOpenAIConnection();
  console.log('');
  
  if (!connectionOk) {
    console.log('⚠️ Skipping remaining tests due to connection failure\n');
    printSummary(Date.now() - totalStartTime);
    return;
  }
  
  // Test 3: Session Initialization
  console.log('📋 Test 3: Session Initialization');
  await testSessionInitialization();
  console.log('');
  
  // Test 4: Audio Data Flow
  console.log('📋 Test 4: Audio Data Flow');
  await testAudioDataFlow();
  console.log('');
  
  printSummary(Date.now() - totalStartTime);
}

function printSummary(totalDuration: number) {
  console.log('='.repeat(60));
  console.log('\n📊 Test Summary\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️ Skipped: ${skipped}`);
  console.log(`⏱️ Total Duration: ${totalDuration}ms`);
  console.log('');
  
  if (failed === 0 && passed > 0) {
    console.log('🎉 All tests passed! OpenAI Realtime API integration is working correctly.\n');
  } else if (failed > 0) {
    console.log('❌ Some tests failed. Please review the errors above.\n');
  } else {
    console.log('⚠️ Tests were skipped. Please check the configuration.\n');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

