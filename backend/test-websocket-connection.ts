/**
 * WebSocket Connection Test for OpenAI Realtime API
 * 
 * This script tests WebSocket connection using the session-based approach
 */

import { WebSocket } from 'ws';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env') });

async function createRealtimeSession(): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No API key found');
    return null;
  }
  
  console.log('🔗 Creating Realtime API session...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse',
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Session created: ${data.id}`);
      console.log(`   Client secret: ${data.client_secret?.value?.substring(0, 20)}...`);
      return data.client_secret?.value || null;
    } else {
      const errorText = await response.text();
      console.log(`❌ Failed to create session: ${response.status} ${response.statusText}`);
      console.log(`   Error: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Error creating session: ${error}`);
    return null;
  }
}

async function testWebSocketConnection(clientSecret: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('\n🔗 Connecting to WebSocket...');
    
    const ws = new WebSocket('wss://api.openai.com/v1/realtime', {
      headers: {
        'Authorization': `Bearer ${clientSecret}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });
    
    const timeout = setTimeout(() => {
      console.log('❌ Connection timeout (15s)');
      ws.close();
      resolve(false);
    }, 15000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connected successfully!');
      
      // Send a session update
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
        
        if (event.type === 'session.updated') {
          console.log('✅ Session updated successfully!');
          console.log('   Voice:', event.session?.voice);
          console.log('   Modalities:', event.session?.modalities);
          
          // Test sending a text message
          console.log('\n📤 Testing response.create...');
          const responseCreate = {
            type: 'response.create',
            response: {
              modalities: ['text'],
              instructions: 'Say "Hello, this is a test."',
            },
          };
          ws.send(JSON.stringify(responseCreate));
        }
        
        if (event.type === 'response.done') {
          console.log('✅ Response completed!');
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
        
        if (event.type === 'error') {
          console.log(`❌ Error: ${event.error?.message || 'Unknown error'}`);
          console.log(`   Code: ${event.error?.code}`);
          clearTimeout(timeout);
          ws.close();
          resolve(false);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });
    
    ws.on('error', (error) => {
      console.log(`❌ WebSocket error: ${error.message}`);
      clearTimeout(timeout);
      resolve(false);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 Connection closed: ${code} ${reason.toString()}`);
      clearTimeout(timeout);
    });
  });
}

async function runTest() {
  console.log('\n🧪 WebSocket Connection Test\n');
  console.log('='.repeat(60));
  console.log('\n');
  
  // Step 1: Create session
  const clientSecret = await createRealtimeSession();
  
  if (!clientSecret) {
    console.log('\n❌ Cannot proceed without client secret\n');
    return;
  }
  
  // Step 2: Test WebSocket connection
  const success = await testWebSocketConnection(clientSecret);
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('\n📊 Test Result:\n');
  
  if (success) {
    console.log('✅ WebSocket connection test PASSED');
    console.log('   The OpenAI Realtime API integration is working correctly!');
  } else {
    console.log('❌ WebSocket connection test FAILED');
    console.log('   Please check the errors above for details.');
  }
  
  console.log('');
}

runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

