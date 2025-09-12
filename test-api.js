#!/usr/bin/env node

/**
 * API Endpoint Test Script
 * 
 * Tests the /api/idea-draft and /api/waitlist endpoints
 * Requires a running server with database connection
 * 
 * Usage: node test-api.js [base-url]
 * Example: node test-api.js http://localhost:3000
 */

const http = require('http');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const TEST_CLIENT_ID = uuidv4();

console.log('🧪 Testing API endpoints...');
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`🔑 Test Client ID: ${TEST_CLIENT_ID}`);

function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;
    
    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testEndpoint(name, url, method, data) {
  console.log(`\n📡 Testing ${name}...`);
  
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Test-Script/1.0'
      }
    };
    
    const response = await makeRequest(url, options, data);
    
    console.log(`   Status: ${response.statusCode}`);
    if (response.body) {
      console.log(`   Response: ${response.body}`);
    } else {
      console.log(`   Response: (empty body)`);
    }
    
    return response;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function runTests() {
  try {
    // Test 1: Health check
    await testEndpoint(
      'Health Check',
      `${BASE_URL}/api/health`,
      'GET'
    );
    
    // Test 2: Draft idea save
    await testEndpoint(
      'Draft Idea Save',
      `${BASE_URL}/api/idea-draft`,
      'POST',
      {
        client_id: TEST_CLIENT_ID,
        idea: 'Test idea: Monitor my garden plants for watering needs',
        sourcePath: '/test'
      }
    );
    
    // Test 3: Update draft idea
    await testEndpoint(
      'Update Draft Idea',
      `${BASE_URL}/api/idea-draft`,
      'POST',
      {
        client_id: TEST_CLIENT_ID,
        idea: 'Updated test idea: Smart garden monitoring with AI vision',
        sourcePath: '/test-updated'
      }
    );
    
    // Test 4: Submit to waitlist
    await testEndpoint(
      'Waitlist Submission',
      `${BASE_URL}/api/waitlist`,
      'POST',
      {
        client_id: TEST_CLIENT_ID,
        idea: 'Final idea: Smart garden monitoring with AI vision',
        name: 'Test User',
        email: 'test@example.com',
        sourcePath: '/test-final'
      }
    );
    
    // Test 5: Invalid requests
    console.log('\n🚫 Testing validation errors...');
    
    await testEndpoint(
      'Invalid UUID',
      `${BASE_URL}/api/idea-draft`,
      'POST',
      {
        client_id: 'invalid-uuid',
        idea: 'Test idea'
      }
    );
    
    await testEndpoint(
      'Missing Required Field',
      `${BASE_URL}/api/waitlist`,
      'POST',
      {
        client_id: uuidv4(),
        idea: 'Test idea',
        name: 'Test User'
        // Missing email
      }
    );
    
    await testEndpoint(
      'Invalid Email',
      `${BASE_URL}/api/waitlist`,
      'POST',
      {
        client_id: uuidv4(),
        idea: 'Test idea',
        name: 'Test User',
        email: 'invalid-email'
      }
    );
    
    console.log('\n🎉 API tests completed!');
    console.log('\nℹ️  Note: If you see 500 errors, make sure:');
    console.log('   - Database is running and migrations are applied');
    console.log('   - DATABASE_URL environment variable is set');
    console.log('   - Server is running with: npm run dev');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testEndpoint };
