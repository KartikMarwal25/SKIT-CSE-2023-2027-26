import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createRateLimiter, byIp, byInstitution } from './rate-limiter.mw.js';

/**
 * DP-02 threshold tests, under simulated load: many rapid requests fired in
 * a tight loop within (and across) the rate window, using fake timers so
 * the window boundary itself is deterministic rather than depending on how
 * fast the test happens to run.
 */
describe('createRateLimiter — DP-02 thresholds under simulated load', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function fireRequests(limiter, req, count) {
    const statuses = [];
    for (let i = 0; i < count; i += 1) {
      const next = jest.fn();
      limiter(req, {}, next);
      statuses.push(next.mock.calls[0]?.[0] === undefined ? 'allowed' : 'rate-limited');
    }
    return statuses;
  }

  it('allows exactly `max` requests per window, rejecting the rest (DP-02: auth 10/min)', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 10, keyFn: byIp });
    const req = { ip: '203.0.113.5' };

    const statuses = fireRequests(limiter, req, 20);

    expect(statuses.filter((s) => s === 'allowed')).toHaveLength(10);
    expect(statuses.filter((s) => s === 'rate-limited')).toHaveLength(10);
  });

  it('resets the count once the window elapses (DP-02: verify 30/min)', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 30, keyFn: byIp });
    const req = { ip: '203.0.113.9' };

    const firstWindow = fireRequests(limiter, req, 30);
    expect(firstWindow.every((s) => s === 'allowed')).toBe(true);

    const stillBlocked = fireRequests(limiter, req, 1);
    expect(stillBlocked[0]).toBe('rate-limited');

    jest.advanceTimersByTime(60_001);

    const secondWindow = fireRequests(limiter, req, 30);
    expect(secondWindow.every((s) => s === 'allowed')).toBe(true);
  });

  it('tracks separate buckets per key (DP-02: issuance/revoke are per institution, not global)', () => {
    const limiter = createRateLimiter({ windowMs: 3_600_000, max: 60, keyFn: byInstitution });
    const institutionA = { auth: { institutionId: 'inst-a' } };
    const institutionB = { auth: { institutionId: 'inst-b' } };

    const aStatuses = fireRequests(limiter, institutionA, 60);
    expect(aStatuses.every((s) => s === 'allowed')).toBe(true);

    // Institution A is now exhausted for the hour — institution B is unaffected.
    expect(fireRequests(limiter, institutionA, 1)[0]).toBe('rate-limited');
    expect(fireRequests(limiter, institutionB, 1)[0]).toBe('allowed');
  });

  it('enforces the 600/hr verify ceiling independently of the 30/min one (two stacked limiters)', () => {
    const perMinute = createRateLimiter({ windowMs: 60_000, max: 30, keyFn: byIp });
    const perHour = createRateLimiter({ windowMs: 3_600_000, max: 600, keyFn: byIp });
    const req = { ip: '203.0.113.20' };

    // 20 windows of 30 requests each = 600 total, each staying under the
    // per-minute cap but adding up to the per-hour cap.
    let hourlyBlocked = false;
    for (let window = 0; window < 20; window += 1) {
      for (let i = 0; i < 30; i += 1) {
        const nextMinute = jest.fn();
        perMinute(req, {}, nextMinute);
        const nextHour = jest.fn();
        perHour(req, {}, nextHour);
        if (nextHour.mock.calls[0]?.[0] !== undefined) hourlyBlocked = true;
      }
      jest.advanceTimersByTime(60_001);
    }
    expect(hourlyBlocked).toBe(false); // exactly 600 — the 601st (not sent here) would trip it

    const next = jest.fn();
    perHour(req, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ code: 'E_RATE_LIMITED' });
  });
});
