import { describe, it, expect, jest } from '@jest/globals';
import { createRequireAuth, requireRole } from './auth.mw.js';

/**
 * Tests the REAL requireAuth/requireRole functions directly — not a fake
 * stand-in like Week 15's access-control.test.js used at the route level.
 * Only `clerkAdapter` is mocked (the actual external boundary); everything
 * else here is the production middleware code executing as it would in the
 * real app.
 */
function mockReqRes(headers = {}) {
  const req = { headers, auth: undefined };
  const res = {};
  const next = jest.fn();
  return { req, res, next };
}

describe('createRequireAuth — real middleware, mocked clerkAdapter', () => {
  it('calls next(err) with E_UNAUTHENTICATED when there is no Authorization header', async () => {
    const clerkAdapter = { verifyToken: jest.fn() };
    const requireAuth = createRequireAuth({ clerkAdapter });
    const { req, res, next } = mockReqRes();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'E_UNAUTHENTICATED' }));
    expect(clerkAdapter.verifyToken).not.toHaveBeenCalled();
  });

  it('calls next(err) with E_UNAUTHENTICATED for a non-Bearer scheme', async () => {
    const clerkAdapter = { verifyToken: jest.fn() };
    const requireAuth = createRequireAuth({ clerkAdapter });
    const { req, res, next } = mockReqRes({ authorization: 'Basic abc123' });

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'E_UNAUTHENTICATED' }));
  });

  it('extracts the raw token from the header and passes it to clerkAdapter.verifyToken', async () => {
    const clerkAdapter = { verifyToken: jest.fn().mockResolvedValue({ userId: 'user_123', role: 'institution' }) };
    const requireAuth = createRequireAuth({ clerkAdapter });
    const { req, res, next } = mockReqRes({ authorization: 'Bearer real-looking-jwt' });

    await requireAuth(req, res, next);

    expect(clerkAdapter.verifyToken).toHaveBeenCalledWith('real-looking-jwt');
    expect(req.auth).toEqual({ userId: 'user_123', role: 'institution' });
    expect(next).toHaveBeenCalledWith(); // called with no error
  });

  it('propagates whatever error clerkAdapter.verifyToken throws (e.g. an expired token)', async () => {
    const verifyError = new Error('token expired');
    const clerkAdapter = { verifyToken: jest.fn().mockRejectedValue(verifyError) };
    const requireAuth = createRequireAuth({ clerkAdapter });
    const { req, res, next } = mockReqRes({ authorization: 'Bearer expired-jwt' });

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(verifyError);
    expect(req.auth).toBeUndefined();
  });
});

describe('requireRole — real middleware', () => {
  it('calls next(err) with E_UNAUTHENTICATED if req.auth was never set (requireAuth did not run first)', () => {
    const middleware = requireRole('institution');
    const { req, res, next } = mockReqRes();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'E_UNAUTHENTICATED' }));
  });

  it('calls next(err) with E_FORBIDDEN when req.auth.role does not match', () => {
    const middleware = requireRole('institution');
    const { req, res, next } = mockReqRes();
    req.auth = { userId: 'u1', role: 'student' };

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'E_FORBIDDEN' }));
  });

  it('calls next() with no error when req.auth.role matches', () => {
    const middleware = requireRole('institution');
    const { req, res, next } = mockReqRes();
    req.auth = { userId: 'u1', role: 'institution' };

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
