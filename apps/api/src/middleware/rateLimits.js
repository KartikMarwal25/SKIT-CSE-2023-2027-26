/**
 * DP-02's four named rate limits. Only `auth` and `issuance` are wired into
 * a real route this week — `verify` and `revoke` don't have API routes yet
 * (verification is still on-chain/frontend-mock only; revocation isn't
 * wired to the API at all), so their limiters are defined here, ready to
 * mount, but unused until those routes exist.
 */
import { createRateLimiter, byIp, byInstitution } from './rate-limiter.mw.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** 30/min per IP. Stack with verifyPerHour for the combined DP-02 limit. */
export const verifyPerMinute = createRateLimiter({ windowMs: MINUTE, max: 30, keyFn: byIp });
/** 600/hr per IP. */
export const verifyPerHour = createRateLimiter({ windowMs: HOUR, max: 600, keyFn: byIp });

/** 10/min per IP. */
export const authPerMinute = createRateLimiter({ windowMs: MINUTE, max: 10, keyFn: byIp });

/** 60/hr per institution. */
export const issuancePerHour = createRateLimiter({ windowMs: HOUR, max: 60, keyFn: byInstitution });

/** 20/hr per institution. */
export const revokePerHour = createRateLimiter({ windowMs: HOUR, max: 20, keyFn: byInstitution });
