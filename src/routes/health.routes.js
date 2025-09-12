import { Router } from 'express';
import db from '../db/pool.js';
import { success } from '../utils/http.js';

const router = Router();

/**
 * Basic health check
 * GET /api/health
 */
router.get('/', (req, res) => {
  res.json(
    success({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV,
    })
  );
});

/**
 * Database health check
 * GET /api/health/db
 */
router.get('/db', async (req, res, next) => {
  try {
    const dbHealth = await db.healthCheck();

    if (dbHealth.ok) {
      res.json(success(dbHealth));
    } else {
      res.status(503).json({
        error: 'Database unavailable',
        details: dbHealth,
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
