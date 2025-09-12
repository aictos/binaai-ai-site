import { logger } from '../config/logger.js';
import { success } from '../utils/http.js';
import * as waitlistService from '../services/waitlist.service.js';

/**
 * Controller for waitlist operations
 * Handles HTTP requests and orchestrates business logic
 */

/**
 * Handle draft idea submission
 * POST /api/idea-draft
 */
export async function createDraftIdea(req, res, next) {
  try {
    const validatedData = req.validatedData;

    logger.debug(
      {
        client_id: validatedData.client_id,
        action: 'draft_submission',
      },
      'Processing draft idea submission'
    );

    // Save draft to database
    await waitlistService.upsertDraftSignup(validatedData);

    // Return 204 No Content for silent draft saves
    // This matches the existing behavior where frontend doesn't show feedback
    res.status(204).send();
  } catch (error) {
    logger.error(
      {
        client_id: req.validatedData?.client_id,
        error: error.message,
        action: 'draft_submission',
      },
      'Draft submission failed'
    );

    // For draft submissions, if it's a database connectivity issue,
    // we should still return success to avoid blocking the user flow
    // since drafts are meant to be "fire-and-forget"
    if (error.status === 503) {
      logger.warn(
        {
          client_id: req.validatedData?.client_id,
          action: 'draft_submission',
        },
        'Database unavailable for draft save, returning success to avoid blocking user'
      );
      res.status(204).send();
      return;
    }

    next(error);
  }
}

/**
 * Handle final waitlist submission
 * POST /api/waitlist
 */
export async function createWaitlistSubmission(req, res, next) {
  try {
    const validatedData = req.validatedData;

    logger.info(
      {
        client_id: validatedData.client_id,
        name: validatedData.name,
        email: validatedData.email,
        action: 'waitlist_submission',
      },
      'Processing waitlist submission'
    );

    // Complete the signup
    const signup = await waitlistService.upsertWaitlistSignup(validatedData);

    // Return success response
    // Frontend will show success toast based on this response
    res.status(201).json(
      success(
        {
          id: signup.id,
          status: signup.status,
        },
        'Thank you for joining our waitlist!'
      )
    );
  } catch (error) {
    logger.error(
      {
        client_id: req.validatedData?.client_id,
        name: req.validatedData?.name,
        email: req.validatedData?.email,
        error: error.message,
        action: 'waitlist_submission',
      },
      'Waitlist submission failed'
    );

    next(error);
  }
}

/**
 * Get signup information by client ID (optional, for debugging)
 * GET /api/signup/:client_id
 */
export async function getSignupInfo(req, res, next) {
  try {
    const { client_id } = req.params;

    // Validate client_id format
    if (!client_id || typeof client_id !== 'string') {
      return res.status(400).json({ error: 'Invalid client_id' });
    }

    const signup = await waitlistService.getSignupByClientId(client_id);

    if (!signup) {
      return res.status(404).json({ error: 'Signup not found' });
    }

    // Return public fields only
    const publicSignup = {
      id: signup.id,
      client_id: signup.client_id,
      status: signup.status,
      created_at: signup.created_at,
      updated_at: signup.updated_at,
      // Don't expose email/name/idea for privacy
    };

    res.json(success(publicSignup));
  } catch (error) {
    logger.error(
      {
        client_id: req.params.client_id,
        error: error.message,
        action: 'get_signup_info',
      },
      'Failed to retrieve signup info'
    );

    next(error);
  }
}

/**
 * Get waitlist statistics (admin/debug endpoint)
 * GET /api/waitlist/stats
 */
export async function getWaitlistStats(req, res, next) {
  try {
    // This could be protected with authentication in production
    const stats = await waitlistService.getWaitlistStats();

    res.json(success(stats));
  } catch (error) {
    logger.error(
      {
        error: error.message,
        action: 'get_waitlist_stats',
      },
      'Failed to retrieve waitlist statistics'
    );

    next(error);
  }
}
