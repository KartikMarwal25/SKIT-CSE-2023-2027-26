import { Router } from 'express';
import { authPerMinute } from '../middleware/rateLimits.js';

/**
 * First auth endpoint — proves requireAuth actually works end to end.
 * Returns exactly what the verified token resolved to; nothing role-gated
 * yet (that's `requireRole`, demonstrated once a route actually needs it).
 * Rate-limited per DP-02 (10/min per IP) as of this week.
 */
export function createAuthRouter({ requireAuth }) {
  const router = Router();

  router.get('/me', authPerMinute, requireAuth, (req, res) => {
    res.status(200).json({ userId: req.auth.userId, role: req.auth.role });
  });

  return router;
}
