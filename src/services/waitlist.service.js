import db from '../db/pool.js';
import { logger } from '../config/logger.js';
import { errors } from '../utils/http.js';

/**
 * Waitlist service for database operations
 * Handles all database interactions for waitlist functionality
 */

/**
 * Upsert a draft signup record
 */
export async function upsertDraftSignup(data) {
  const { client_id, idea, sourcePath, user_agent } = data;

  const query = `
    INSERT INTO waitlist_signups (client_id, idea, source_path, user_agent, status)
    VALUES ($1, $2, $3, $4, 'draft')
    ON CONFLICT (client_id) 
    DO UPDATE SET 
      idea = EXCLUDED.idea,
      source_path = EXCLUDED.source_path,
      user_agent = EXCLUDED.user_agent,
      updated_at = NOW()
    RETURNING id, client_id, status, created_at, updated_at
  `;

  try {
    const result = await db.query(query, [client_id, idea, sourcePath, user_agent]);

    logger.debug(
      {
        client_id,
        action: 'draft_upsert',
        rowCount: result.rowCount,
      },
      'Draft signup upserted'
    );

    return result.rows[0];
  } catch (error) {
    logger.error(
      {
        client_id,
        error: error.message,
        action: 'draft_upsert',
      },
      'Failed to upsert draft signup'
    );

    throw errors.internal('Failed to save draft');
  }
}

/**
 * Upsert a complete waitlist signup
 */
export async function upsertWaitlistSignup(data) {
  const { client_id, idea, name, email, sourcePath, user_agent } = data;

  const query = `
    INSERT INTO waitlist_signups (client_id, idea, name, email, source_path, user_agent, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'submitted')
    ON CONFLICT (client_id) 
    DO UPDATE SET 
      idea = EXCLUDED.idea,
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      source_path = EXCLUDED.source_path,
      user_agent = EXCLUDED.user_agent,
      status = 'submitted',
      updated_at = NOW()
    RETURNING id, client_id, idea, name, email, status, created_at, updated_at
  `;

  try {
    const result = await db.query(query, [client_id, idea, name, email, sourcePath, user_agent]);

    logger.info(
      {
        client_id,
        name,
        email,
        action: 'waitlist_signup',
        rowCount: result.rowCount,
      },
      'Waitlist signup completed'
    );

    return result.rows[0];
  } catch (error) {
    // Handle specific database errors
    if (error.code === '23505' && error.constraint?.includes('email')) {
      throw errors.conflict('Email address already registered');
    }

    logger.error(
      {
        client_id,
        name,
        email,
        error: error.message,
        action: 'waitlist_signup',
      },
      'Failed to complete waitlist signup'
    );

    throw errors.internal('Failed to complete signup');
  }
}

/**
 * Get signup by client_id
 */
export async function getSignupByClientId(client_id) {
  const query = `
    SELECT id, client_id, idea, name, email, source_path, user_agent, status, created_at, updated_at
    FROM waitlist_signups 
    WHERE client_id = $1
  `;

  try {
    const result = await db.query(query, [client_id]);

    return result.rows[0] || null;
  } catch (error) {
    logger.error(
      {
        client_id,
        error: error.message,
        action: 'get_signup',
      },
      'Failed to retrieve signup'
    );

    throw errors.internal('Failed to retrieve signup data');
  }
}

/**
 * Get waitlist statistics (optional, for admin/debugging)
 */
export async function getWaitlistStats() {
  const query = `
    SELECT 
      status,
      COUNT(*) as count,
      MIN(created_at) as earliest,
      MAX(created_at) as latest
    FROM waitlist_signups 
    GROUP BY status
    ORDER BY status
  `;

  try {
    const result = await db.query(query);

    const stats = result.rows.reduce((acc, row) => {
      acc[row.status] = {
        count: parseInt(row.count, 10),
        earliest: row.earliest,
        latest: row.latest,
      };
      return acc;
    }, {});

    // Also get total count
    const totalQuery = `SELECT COUNT(*) as total FROM waitlist_signups`;
    const totalResult = await db.query(totalQuery);

    return {
      byStatus: stats,
      total: parseInt(totalResult.rows[0].total, 10),
    };
  } catch (error) {
    logger.error(
      {
        error: error.message,
        action: 'get_stats',
      },
      'Failed to retrieve waitlist statistics'
    );

    throw errors.internal('Failed to retrieve statistics');
  }
}
