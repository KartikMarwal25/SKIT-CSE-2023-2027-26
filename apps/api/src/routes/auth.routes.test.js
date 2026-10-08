import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';

// Mocks the whole Clerk SDK so this test never needs a real Clerk project —
// same pattern as chain.adapter.test.js mocking 'ethers' (Week 8).
const mockVerifyToken = jest.fn();
jest.unstable_mockModule('@clerk/backend', () => ({
  verifyToken: mockVerifyToken,
}));

// Mocks the pg pool too (createApp() -> health router -> pool.js) so this
// test file has zero real external dependencies, matching health.test.js's
// established pattern (Week 2).
jest.unstable_mockModule('../repositories/pool.js', () => ({
  pool: { query: jest.fn().mockResolvedValue({ rows: [{ ok: 1 }] }) },
}));

const { createApp } = await import('../app.js');

describe('GET /api/v1/auth/me', () => {
  it('returns 401 when no Authorization header is sent', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('E_UNAUTHENTICATED');
  });

  it('returns 401 when the Authorization header is not a Bearer token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Basic abc123');
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token fails verification', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('invalid signature'));
    const app = createApp();
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('E_UNAUTHENTICATED');
  });

  it('returns 200 with the verified user id and role for a valid token', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user_abc123', role: 'institution' });
    const app = createApp();
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer good-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 'user_abc123', role: 'institution' });
  });
});
