/** Crockford Base32 — excludes the visually-ambiguous I, L, O, U. */
export const CROCKFORD_BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * The system exception catalogue (SRS EX-01…EX-14) — only the codes actually
 * reachable by what's built so far. More get added as the features that can
 * throw them exist; inventing the full SRS list ahead of the code that
 * throws each one would just be dead entries nobody can verify yet.
 */
export const ERROR_CODE = Object.freeze({
  E_VALIDATION: 'E_VALIDATION',
  E_NOT_FOUND: 'E_NOT_FOUND',
  E_DUPLICATE_CERTIFICATE: 'E_DUPLICATE_CERTIFICATE',
  E_NOT_IMPLEMENTED: 'E_NOT_IMPLEMENTED',
  E_INTERNAL: 'E_INTERNAL',
});

/** HTTP status each error code maps to. */
export const ERROR_STATUS = Object.freeze({
  [ERROR_CODE.E_VALIDATION]: 400,
  [ERROR_CODE.E_NOT_FOUND]: 404,
  [ERROR_CODE.E_DUPLICATE_CERTIFICATE]: 409,
  [ERROR_CODE.E_NOT_IMPLEMENTED]: 501,
  [ERROR_CODE.E_INTERNAL]: 500,
});
