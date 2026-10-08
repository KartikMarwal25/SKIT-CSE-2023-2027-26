import { Router } from 'express';

/**
 * First auth endpoint — proves requireAuth actually works end to end.
 * Returns exactly what the verified token resolved to; nothing role-gated
 * yet (that's `requireRole`, demonstrated once a route actually needs it).
 */
export function createAuthRouter({ requireAuth }) {
  const router = Router();

  router.get('/me', requireAuth, (req, res) => {
    res.status(200).json({ userId: req.auth.userId, role: req.auth.role });
  });

  return router;
}
