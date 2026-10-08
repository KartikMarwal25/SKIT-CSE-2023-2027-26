/**
 * Authentication + role-based access-control middleware. `req.auth` is only
 * ever set from a verified token — never trusted from the request body,
 * query, or headers directly.
 */
import { AppError } from '../lib/errors.js';

/**
 * Builds the `requireAuth` middleware: verifies the bearer token and
 * attaches `req.auth`.
 *
 * @param {object} deps
 * @param {object} deps.clerkAdapter
 * @returns {import('express').RequestHandler}
 */
export const createRequireAuth = ({ clerkAdapter }) => async (req, _res, next) => {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError('E_UNAUTHENTICATED', 'Sign in to continue.');
    }
    const claims = await clerkAdapter.verifyToken(token);
    req.auth = { userId: claims.userId, role: claims.role };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Builds a middleware that requires `req.auth.role` to match `role` — must
 * run after `requireAuth`. Only checks the role already on `req.auth`; it
 * does not itself verify anything.
 *
 * @param {string} role - One of @securecred/shared's ROLE values.
 * @returns {import('express').RequestHandler}
 */
export const requireRole = (role) => (req, _res, next) => {
  if (!req.auth) {
    next(new AppError('E_UNAUTHENTICATED', 'Sign in to continue.'));
    return;
  }
  if (req.auth.role !== role) {
    next(new AppError('E_FORBIDDEN', 'You do not have access to this resource.'));
    return;
  }
  next();
};
