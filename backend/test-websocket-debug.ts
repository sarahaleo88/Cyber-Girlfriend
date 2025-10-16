/**
 * WebSocket Connection Debug Script
 * 
 * This script tries different WebSocket connection approaches to identify the issue
 */

import { WebSocket } from 'ws';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as https from 'https';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env') });

async function testHTTPSConnection() {
  console.log('\n📋 Test 1: HTTPS Connection to OpenAI');
  console.log('='.repeat(60));
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/models',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      console.log(`✅ HTTPS connection successful: ${res.statusCode}`);
      console.log(`   Headers:`, res.headers);
      resolve(true);
    });

    req.on('error', (error) => {
      console.log(`❌ HTTPS connection failed: ${error.message}`);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      console.log('❌ HTTPS connection timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function testWebSocketWithModel() {
  console.log('\n📋 Test 2: WebSocket with Model in URL');
  console.log('='.repeat(60));

  const apiKey = process.env.OPENAI_API_KEY;
  
  return new Promise((resolve) => {
    const wsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
    
    console.log(`🔗 Connecting to: ${wsUrl}`);
    console.log(`   Using API key: ${apiKey?.substring(0, 20)}...`);

    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    const timeout = setTimeout(() => {
      console.log('❌ Connection timeout (10s)');
      ws.close();
      resolve(false);
    }, 10000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connected!');
      ws.close();
      resolve(true);
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`❌ WebSocket error: ${error.message}`);
      console.log(`   Error details:`, error);
      resolve(false);
    });

    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      console.log(`🔌 Connection closed: ${code} ${reason.toString()}`);
      if (code !== 1000) {
        resolve(false);
      }
    });
  });
}

async function testWebSocketWithEphemeralKey() {
  console.log('\n📋 Test 3: WebSocket with Ephemeral Key');
  console.log('='.repeat(60));

  // First create a session
  console.log('🔑 Creating session...');
  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'verse',
    }),
  });

  if (!response.ok) {
    console.log(`❌ Failed to create session: ${response.status}`);
    return false;
  }

  const session = await response.json();
  const ephemeralKey = session.client_secret.value;
  console.log(`✅ Session created: ${session.id}`);
  console.log(`   Ephemeral key: ${ephemeralKey.substring(0, 20)}...`);

  return new Promise((resolve) => {
    const wsUrl = 'wss://api.openai.com/v1/realtime';
    
    console.log(`🔗 Connecting to: ${wsUrl}`);

    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${ephemeralKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    const timeout = setTimeout(() => {
      console.log('❌ Connection timeout (10s)');
      ws.close();
      resolve(false);
    }, 10000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connected!');
      ws.close();
      resolve(true);
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`❌ WebSocket error: ${error.message}`);
      console.log(`   Error details:`, error);
      resolve(false);
    });

    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      console.log(`🔌 Connection closed: ${code} ${reason.toString()}`);
      if (code !== 1000) {
        resolve(false);
      }
    });
  });
}

async function testWebSocketBasic() {
  console.log('\n📋 Test 4: Basic WebSocket Test (wss://echo.websocket.org)');
  console.log('='.repeat(60));

  return new Promise((resolve) => {
    const ws = new WebSocket('wss://echo.websocket.org');

    const timeout = setTimeout(() => {
      console.log('❌ Connection timeout (10s)');
      ws.close();
      resolve(false);
    }, 10000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connected to echo server!');
      console.log('   This confirms WebSocket connections work in general');
      ws.close();
      resolve(true);
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`❌ WebSocket error: ${error.message}`);
      resolve(false);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

async function checkEnvironment() {
  console.log('\n📋 Environment Check');
  console.log('='.repeat(60));
  
  console.log(`Node version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`API Key: ${process.env.OPENAI_API_KEY?.substring(0, 20)}...`);
  
  // Check for proxy settings
  console.log(`\nProxy settings:`);
  console.log(`  HTTP_PROXY: ${process.env.HTTP_PROXY || 'not set'}`);
  console.log(`  HTTPS_PROXY: ${process.env.HTTPS_PROXY || 'not set'}`);
  console.log(`  NO_PROXY: ${process.env.NO_PROXY || 'not set'}`);
}

async function runAllTests() {
  console.log('\n🧪 WebSocket Connection Debug Suite\n');
  console.log('='.repeat(60));

  await checkEnvironment();

  const results = {
    https: await testHTTPSConnection(),
    basicWs: await testWebSocketBasic(),
    wsWithModel: await testWebSocketWithModel(),
    wsWithEphemeral: await testWebSocketWithEphemeralKey(),
  };

  console.log('\n');
  console.log('='.repeat(60));
  console.log('\n📊 Summary\n');
  console.log(`HTTPS Connection: ${results.https ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Basic WebSocket: ${results.basicWs ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`WS with Model: ${results.wsWithModel ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`WS with Ephemeral: ${results.wsWithEphemeral ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  if (!results.https) {
    console.log('⚠️ HTTPS connection failed - network or firewall issue');
  } else if (!results.basicWs) {
    console.log('⚠️ Basic WebSocket failed - WebSocket connections may be blocked');
  } else if (!results.wsWithModel && !results.wsWithEphemeral) {
    console.log('⚠️ OpenAI WebSocket connections fail but others work');
    console.log('   This suggests:');
    console.log('   1. OpenAI may be blocking connections from your IP/region');
    console.log('   2. There may be a firewall rule specific to OpenAI');
    console.log('   3. The WebSocket endpoint may have changed');
    console.log('   4. There may be a temporary service issue');
    console.log('');
    console.log('💡 Recommended actions:');
    console.log('   1. Check OpenAI status page: https://status.openai.com');
    console.log('   2. Try from a different network');
    console.log('   3. Check if VPN is interfering');
    console.log('   4. Contact OpenAI support if issue persists');
  }

  console.log('');
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

