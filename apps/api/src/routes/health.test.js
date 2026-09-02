import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';

// Mocks the pg pool so this test doesn't need a real database — the health
// repo's real query is exercised separately once real integration tests
// exist (Week 4+); this week is about the Jest structure existing at all.
jest.unstable_mockModule('../repositories/pool.js', () => ({
  pool: { query: jest.fn().mockResolvedValue({ rows: [{ ok: 1 }] }) },
}));

const { createApp } = await import('../app.js');

describe('GET /api/v1/health', () => {
  it('returns 200 and postgres: ok when the database responds', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', postgres: 'ok' });
  });
});
