/**
 * Last middleware in the chain (L2) — catches everything a route calls
 * next(err) with, or that Express itself forwards from a rejected async
 * handler (Express 4: only for errors passed to next(), not thrown directly
 * — routes still need their own try/catch, as certificates.routes.js does).
 */
import { AppError, toWire } from '../lib/errors.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err instanceof AppError ? err.status : 500;
  res.status(status).json(toWire(err));
}
