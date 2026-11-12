/**
 * SHA-256 hashing — the on-chain certificateHash is always this, over
 * whatever bytes represent the certificate's content.
 */
import { createHash } from 'node:crypto';

/**
 * @param {Buffer|string} data
 * @returns {string} 64-char lowercase hex digest.
 */
export function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}
