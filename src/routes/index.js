import { Router } from 'express';
import healthRoutes from './health.routes.js';
import waitlistRoutes from './waitlist.routes.js';

const router = Router();

/**
 * Mount all API routes
 * All routes here will be prefixed with /api
 */

// Health check routes
router.use('/health', healthRoutes);

// Waitlist routes - mount both prefixed and direct routes
router.use('/', waitlistRoutes);

export default router;
