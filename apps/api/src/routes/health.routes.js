import { Router } from 'express';
import { ping } from '../repositories/health.repo.js';

export function createHealthRouter() {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const dbOk = await ping();
      res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'ok' : 'error', postgres: dbOk ? 'ok' : 'down' });
    } catch {
      res.status(503).json({ status: 'error', postgres: 'down' });
    }
  });

  return router;
}
