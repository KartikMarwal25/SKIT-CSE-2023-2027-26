/**
 * Express app factory. Deliberately minimal at this stage — this is the L1
 * (routes) entry point only; middleware (L2), request validation, and error
 * handling are scaffolded in later weeks once there's a service layer (L3)
 * for them to sit in front of.
 */
import express from 'express';
import { createHealthRouter } from './routes/health.routes.js';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/api/v1/health', createHealthRouter());

  return app;
}
