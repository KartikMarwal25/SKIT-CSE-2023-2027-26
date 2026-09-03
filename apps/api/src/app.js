/**
 * Express app factory. L1 (routes) entry point. Middleware (L2), request
 * validation, and error handling are scaffolded once there's more than one
 * feature route to share them across.
 */
import express from 'express';
import { createHealthRouter } from './routes/health.routes.js';
import { createCertificatesRouter } from './routes/certificates.routes.js';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/api/v1/health', createHealthRouter());
  app.use('/api/v1/certificates', createCertificatesRouter());

  return app;
}
