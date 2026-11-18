import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/error-handler.mw.js';
import { AppError } from '../lib/errors.js';

/**
 * A dedicated pass across every route's actual role boundary — issuer
 * (institution), verifier (the public), holder (student) — rather than the
 * boundary checks already scattered one-per-file across certificates.routes.
 * test.js and auth.routes.test.js. Collects them in one place specifically
 * so "what can each role actually do" is answerable by reading one file.
 *
 * requireAuth here is a fake middleware trusting an `x-test-role` header
 * (no header = unauthenticated) — same pattern as the other route test
 * files, since none of them are testing real Clerk verification.
 */
const chainAdapter = {
  issueCertificate: jest.fn().mockResolvedValue({ txHash: '0xabc' }),
  verifyCertificate: jest.fn().mockResolvedValue('VERIFIED'),
  revokeCertificate: jest.fn().mockResolvedValue({ txHash: '0xdef' }),
};

const requireAuth = (req, res, next) => {
  const role = req.headers['x-test-role'];
  if (!role) {
    next(new AppError('E_UNAUTHENTICATED', 'Sign in to continue.'));
    return;
  }
  req.auth = { userId: 'test-user', role };
  next();
};

const mockFindByCertificateNumber = jest.fn().mockResolvedValue({ certificate_hash: 'a'.repeat(64) });
jest.unstable_mockModule('../repositories/certificate.repo.js', () => ({
  findById: jest.fn(),
  findByCertificateNumber: mockFindByCertificateNumber,
  updateStatus: jest.fn(),
}));

const { createCertificatesRouter } = await import('./certificates.routes.js');
const { createAuthRouter } = await import('./auth.routes.js');

const app = express();
app.use(express.json());
app.use('/api/v1/certificates', createCertificatesRouter({ chainAdapter, requireAuth }));
app.use('/api/v1/auth', createAuthRouter({ requireAuth }));
app.use(errorHandler);

const CERT_NUMBER = 'SKIT-2026-000000000001';
const VALID_ISSUANCE_PAYLOAD = {
  holderName: 'Asha Verma',
  holderEmail: 'asha@example.com',
  enrollmentNumber: 'SKIT2026CS001',
  title: 'B.Tech in Computer Science',
  certificateType: 'DEGREE',
  course: 'CSE',
  issueDate: '2026-08-01',
};

describe('Access control — verifier (the public, unauthenticated)', () => {
  it('can verify a certificate with no auth at all — public by design', async () => {
    const res = await request(app).get(`/api/v1/certificates/verify/${CERT_NUMBER}`);
    expect(res.status).toBe(200);
  });

  it('cannot read GET /auth/me — 401 without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('cannot revoke a certificate — 401 without a token', async () => {
    const res = await request(app)
      .post(`/api/v1/certificates/${CERT_NUMBER}/revoke`)
      .send({ reason: 'attempting without auth' });
    expect(res.status).toBe(401);
  });
});

describe('Access control — holder (student)', () => {
  it('cannot revoke a certificate — 403, revocation is institution-only', async () => {
    const res = await request(app)
      .post(`/api/v1/certificates/${CERT_NUMBER}/revoke`)
      .set('x-test-role', 'student')
      .send({ reason: 'a student should not be able to do this' });
    expect(res.status).toBe(403);
  });

  it('can still verify a certificate — the verify endpoint has no role check at all', async () => {
    const res = await request(app).get(`/api/v1/certificates/verify/${CERT_NUMBER}`).set('x-test-role', 'student');
    expect(res.status).toBe(200);
  });
});

describe('Access control — issuer (institution)', () => {
  it('can revoke a certificate — 200', async () => {
    const res = await request(app)
      .post(`/api/v1/certificates/${CERT_NUMBER}/revoke`)
      .set('x-test-role', 'institution')
      .send({ reason: 'a legitimate institution revocation' });
    expect(res.status).toBe(200);
  });
});

describe('Access control — known gap (not a bug to silently work around)', () => {
  it('POST /certificates currently has NO role check — any authenticated OR unauthenticated caller can submit an issuance request', async () => {
    // Documenting current behavior, not asserting it's correct: this route
    // has never had requireAuth applied to it (see certificates.routes.js —
    // only /verify and /:certificateNumber/revoke take requireAuth as a
    // dependency). A student, or nobody at all, can currently trigger a
    // real on-chain issueCertificate() call. Flagged here so it's visible
    // and testable, not silently patched over — restricting this to
    // institution-only is a real, separate piece of work for whoever picks
    // it up (it also needs the auth+institution-resolution wiring
    // issuanceService.js's own Week 14 header comment already flags as
    // missing).
    const noAuthRes = await request(app).post('/api/v1/certificates').send(VALID_ISSUANCE_PAYLOAD);
    expect(noAuthRes.status).toBe(202);

    const studentRes = await request(app)
      .post('/api/v1/certificates')
      .set('x-test-role', 'student')
      .send(VALID_ISSUANCE_PAYLOAD);
    expect(studentRes.status).toBe(202);
  });
});
