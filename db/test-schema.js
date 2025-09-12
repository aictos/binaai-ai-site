#!/usr/bin/env node

/**
 * Schema Test Runner
 * 
 * Tests the database schema to ensure it works correctly
 * Run this after migrations to validate the setup
 */

require('dotenv').config();
const { 
  generateClientId,
  upsertDraftSignup,
  submitSignup,
  getSignupByClientId,
  getSignups,
  getSignupStats,
  pool
} = require('./queries');

async function testSchema() {
  console.log('🧪 Testing database schema...');
  
  try {
    // Test 1: Generate a client ID
    const clientId = generateClientId();
    console.log('✅ Generated client ID:', clientId);
    
    // Test 2: Create a draft signup
    console.log('\n📝 Testing draft signup creation...');
    const draft = await upsertDraftSignup({
      clientId,
      idea: 'Test idea: Detect if my cat is sleeping',
      userAgent: 'Test Agent',
      sourcePath: '/test'
    });
    console.log('✅ Created draft:', { id: draft.id, status: draft.status });
    
    // Test 3: Update the draft
    console.log('\n📝 Testing draft update...');
    const updatedDraft = await upsertDraftSignup({
      clientId,
      idea: 'Updated idea: Monitor my cat\'s sleep patterns',
      name: 'Test User'
    });
    console.log('✅ Updated draft:', { 
      id: updatedDraft.id, 
      status: updatedDraft.status,
      has_name: !!updatedDraft.name 
    });
    
    // Test 4: Submit the signup
    console.log('\n📨 Testing signup submission...');
    const submitted = await submitSignup({
      clientId,
      name: 'Test User',
      email: 'test@example.com'
    });
    console.log('✅ Submitted signup:', { 
      id: submitted.id, 
      status: submitted.status,
      email: submitted.email 
    });
    
    // Test 5: Retrieve by client ID
    console.log('\n🔍 Testing retrieval by client ID...');
    const retrieved = await getSignupByClientId(clientId);
    console.log('✅ Retrieved signup:', { 
      id: retrieved.id,
      status: retrieved.status,
      created_at: retrieved.created_at
    });
    
    // Test 6: Get all signups
    console.log('\n📋 Testing signup list...');
    const signups = await getSignups({ limit: 5 });
    console.log('✅ Retrieved signups:', signups.length);
    
    // Test 7: Get stats
    console.log('\n📊 Testing signup stats...');
    const stats = await getSignupStats();
    console.log('✅ Stats retrieved:', stats.length, 'entries');
    
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await pool.query('DELETE FROM waitlist_signups WHERE client_id = $1', [clientId]);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All schema tests passed!');
    
  } catch (error) {
    console.error('\n❌ Schema test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests if called directly
if (require.main === module) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  testSchema();
}

module.exports = testSchema;
