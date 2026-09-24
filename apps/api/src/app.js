/**
 * Express app factory. L1 (routes) entry point.
 */
import express from 'express';
import { createHealthRouter } from './routes/health.routes.js';
import { createCertificatesRouter } from './routes/certificates.routes.js';
import { errorHandler } from './middleware/error-handler.mw.js';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/api/v1/health', createHealthRouter());
  app.use('/api/v1/certificates', createCertificatesRouter());
  app.use(errorHandler);

  return app;
}
