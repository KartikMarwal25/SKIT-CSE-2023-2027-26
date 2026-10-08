/**
 * Express app factory. L1 (routes) entry point.
 */
import express from 'express';
import { config } from './lib/config.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createCertificatesRouter } from './routes/certificates.routes.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createClerkAdapter } from './adapters/clerk.adapter.js';
import { createRequireAuth } from './middleware/auth.mw.js';
import { errorHandler } from './middleware/error-handler.mw.js';

export function createApp() {
  const app = express();
  const clerkAdapter = createClerkAdapter({ config });
  const requireAuth = createRequireAuth({ clerkAdapter });

  app.use(express.json());
  app.use('/api/v1/health', createHealthRouter());
  app.use('/api/v1/certificates', createCertificatesRouter());
  app.use('/api/v1/auth', createAuthRouter({ requireAuth }));
  app.use(errorHandler);

  return app;
}
