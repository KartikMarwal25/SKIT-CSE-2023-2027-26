/**
 * Identity verification via Clerk — first pass. Verifies a bearer session
 * token and returns its decoded claims. No dev-bypass mode yet (needs a real
 * Clerk secret key to run); no webhook verification yet (nothing in this
 * build creates accounts from a webhook). Both are realistic follow-ups once
 * this is actually exercised against a running Clerk project.
 */
import { verifyToken as clerkVerifyToken } from '@clerk/backend';
import { AppError } from '../lib/errors.js';

/**
 * Creates the Clerk identity adapter.
 *
 * @param {object} deps
 * @param {object} deps.config - Frozen app config (uses clerkSecretKey).
 * @returns {object} Frozen adapter: `{ verifyToken }`.
 */
export const createClerkAdapter = ({ config }) => {
  /**
   * @param {string} bearerToken - Raw token, without the `Bearer ` prefix.
   * @returns {Promise<{userId: string, role: string|null}>}
   * @throws {AppError} E_UNAUTHENTICATED if the token is missing/invalid/expired.
   */
  const verifyToken = async (bearerToken) => {
    if (!bearerToken) {
      throw new AppError('E_UNAUTHENTICATED', 'Sign in to continue.');
    }
    try {
      const claims = await clerkVerifyToken(bearerToken, { secretKey: config.clerkSecretKey });
      return { userId: claims.sub, role: claims.role ?? null };
    } catch {
      throw new AppError('E_UNAUTHENTICATED', 'Sign in to continue.');
    }
  };

  return Object.freeze({ verifyToken });
};
