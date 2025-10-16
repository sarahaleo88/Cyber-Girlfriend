/**
 * OpenAI API Key Validity Test
 * 
 * This script tests if the API key is valid by making a simple API call
 * to the OpenAI API (not the Realtime API).
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env') });

async function testAPIKeyValidity() {
  console.log('\n🔑 Testing OpenAI API Key Validity\n');
  console.log('='.repeat(60));
  console.log('\n');
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY not found in environment');
    return;
  }
  
  console.log(`✅ API Key loaded: ${apiKey.substring(0, 20)}...`);
  console.log('');
  
  // Test 1: Check API key format
  console.log('📋 Test 1: API Key Format');
  if (apiKey.startsWith('sk-proj-')) {
    console.log('✅ API key format: Project key (sk-proj-...)');
  } else if (apiKey.startsWith('sk-')) {
    console.log('✅ API key format: Standard key (sk-...)');
  } else {
    console.log('❌ API key format: Invalid (should start with sk-)');
    return;
  }
  console.log('');
  
  // Test 2: Make a simple API call to verify the key works
  console.log('📋 Test 2: API Key Validation (Models List)');
  console.log('🔗 Calling OpenAI API to list models...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API key is valid! Found ${data.data?.length || 0} models`);
      
      // Check if realtime model is available
      const realtimeModel = data.data?.find((m: any) => m.id.includes('realtime'));
      if (realtimeModel) {
        console.log(`✅ Realtime model found: ${realtimeModel.id}`);
      } else {
        console.log('⚠️ No realtime model found in available models');
        console.log('   This API key may not have access to the Realtime API');
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ API key validation failed: ${response.status} ${response.statusText}`);
      console.log(`   Error: ${errorText}`);
      
      if (response.status === 401) {
        console.log('   → The API key is invalid or has been revoked');
      } else if (response.status === 429) {
        console.log('   → Rate limit exceeded');
      }
    }
  } catch (error) {
    console.log(`❌ Error calling OpenAI API: ${error}`);
  }
  
  console.log('');
  
  // Test 3: Check Realtime API access
  console.log('📋 Test 3: Realtime API Access Check');
  console.log('🔗 Attempting to connect to Realtime API...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-10-01',
        voice: 'alloy',
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Realtime API access confirmed!');
      console.log(`   Session ID: ${data.id || 'N/A'}`);
    } else {
      const errorText = await response.text();
      console.log(`⚠️ Realtime API access check: ${response.status} ${response.statusText}`);
      console.log(`   Response: ${errorText}`);
      
      if (response.status === 404) {
        console.log('   → The Realtime API endpoint may have changed or is not available');
      } else if (response.status === 403) {
        console.log('   → This API key does not have access to the Realtime API');
        console.log('   → You may need to request access or use a different API key');
      }
    }
  } catch (error) {
    console.log(`⚠️ Error checking Realtime API access: ${error}`);
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('\n💡 Summary:\n');
  console.log('If the API key is valid but Realtime API access fails:');
  console.log('1. The Realtime API is in beta and may require special access');
  console.log('2. Check OpenAI documentation for current Realtime API status');
  console.log('3. Verify your OpenAI account has Realtime API access enabled');
  console.log('4. The API key may need specific permissions or tier level');
  console.log('');
}

testAPIKeyValidity().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

