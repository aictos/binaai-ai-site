import { Router } from 'express';
import { validateDraftSubmission, validateWaitlistSubmission } from '../middleware/validate.js';
import * as waitlistController from '../controllers/waitlist.controller.js';

const router = Router();

/**
 * Draft idea submission (silent save)
 * POST /api/idea-draft
 */
router.post('/idea-draft', validateDraftSubmission, waitlistController.createDraftIdea);

/**
 * Final waitlist submission
 * POST /api/waitlist
 */
router.post('/waitlist', validateWaitlistSubmission, waitlistController.createWaitlistSubmission);

/**
 * Get signup info by client ID (optional, for debugging)
 * GET /api/signup/:client_id
 */
router.get('/signup/:client_id', waitlistController.getSignupInfo);

/**
 * Get waitlist statistics (admin/debug)
 * GET /api/waitlist/stats
 */
router.get('/waitlist/stats', waitlistController.getWaitlistStats);

export default router;
