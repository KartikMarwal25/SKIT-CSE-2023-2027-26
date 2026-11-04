/**
 * Express app factory. L1 (routes) entry point.
 */
import express from 'express';
import { createContainer } from './container.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createCertificatesRouter } from './routes/certificates.routes.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { errorHandler } from './middleware/error-handler.mw.js';

export function createApp() {
  const app = express();
  const { chainAdapter, requireAuth } = createContainer();

  app.use(express.json());
  app.use('/api/v1/health', createHealthRouter());
  app.use('/api/v1/certificates', createCertificatesRouter({ chainAdapter, requireAuth }));
  app.use('/api/v1/auth', createAuthRouter({ requireAuth }));
  app.use(errorHandler);

  return app;
}
