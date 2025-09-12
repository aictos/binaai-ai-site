/**
 * Database Query Helpers
 * 
 * Helper functions for interacting with the waitlist_signups table
 */

const { Pool } = require('pg');

// Use the same pool configuration as the main app
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Generate a new client ID
 */
function generateClientId() {
  // This will be handled by uuid_generate_v4() in the database
  // But we can also generate one on the client side if needed
  const { v4: uuidv4 } = require('uuid');
  return uuidv4();
}

/**
 * Create or update a draft signup
 */
async function upsertDraftSignup({ clientId, idea, name = null, email = null, userAgent = null, sourcePath = null }) {
  const query = `
    INSERT INTO waitlist_signups (client_id, idea, name, email, user_agent, source_path, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'draft')
    ON CONFLICT (client_id) 
    DO UPDATE SET 
      idea = EXCLUDED.idea,
      name = COALESCE(EXCLUDED.name, waitlist_signups.name),
      email = COALESCE(EXCLUDED.email, waitlist_signups.email),
      user_agent = COALESCE(EXCLUDED.user_agent, waitlist_signups.user_agent),
      source_path = COALESCE(EXCLUDED.source_path, waitlist_signups.source_path),
      updated_at = NOW()
    RETURNING *;
  `;
  
  const values = [clientId, idea, name, email, userAgent, sourcePath];
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Submit a signup (change status from draft to submitted)
 */
async function submitSignup({ clientId, name, email }) {
  const query = `
    UPDATE waitlist_signups 
    SET 
      name = $2,
      email = $3,
      status = 'submitted',
      updated_at = NOW()
    WHERE client_id = $1 AND status = 'draft'
    RETURNING *;
  `;
  
  const values = [clientId, name, email];
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Get a signup by client ID
 */
async function getSignupByClientId(clientId) {
  const query = `
    SELECT * FROM waitlist_signups 
    WHERE client_id = $1;
  `;
  
  const result = await pool.query(query, [clientId]);
  return result.rows[0];
}

/**
 * Get all signups with pagination
 */
async function getSignups({ status = null, limit = 50, offset = 0 } = {}) {
  let query = `
    SELECT * FROM waitlist_signups
  `;
  const values = [];
  
  if (status) {
    query += ` WHERE status = $1`;
    values.push(status);
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  values.push(limit, offset);
  
  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Get signup statistics
 */
async function getSignupStats() {
  const query = `
    SELECT 
      status,
      COUNT(*) as count,
      DATE_TRUNC('day', created_at) as date
    FROM waitlist_signups 
    GROUP BY status, DATE_TRUNC('day', created_at)
    ORDER BY date DESC, status;
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Clean up old draft signups (older than 7 days)
 */
async function cleanupOldDrafts() {
  const query = `
    DELETE FROM waitlist_signups 
    WHERE status = 'draft' 
      AND created_at < NOW() - INTERVAL '7 days'
    RETURNING id;
  `;
  
  const result = await pool.query(query);
  return result.rows.length;
}

module.exports = {
  pool,
  generateClientId,
  upsertDraftSignup,
  submitSignup,
  getSignupByClientId,
  getSignups,
  getSignupStats,
  cleanupOldDrafts
};
