import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/error-handler.mw.js';
import { AppError } from '../lib/errors.js';

// error-handler.mw.js must be mounted for AppError to reach the client as
// JSON at all — without it, Express's own default handler takes over and
// returns an HTML error page instead.
//
// createCertificatesRouter() now requires { chainAdapter, requireAuth } —
// a direct, unavoidable consequence of wiring the verify/revoke routes to
// chain.adapter.js this week. Both are stand-ins here: chainAdapter is a
// jest.fn()-backed mock (this file tests the ROUTE's error-mapping
// behaviour, not chain.adapter.js's own custom-error decoding — that's
// covered separately once a dedicated chain.adapter revoke test exists),
// and requireAuth is a fake middleware that trusts an `x-test-role` header
// instead of doing real Clerk verification, since nothing here is testing
// authentication itself.
const chainAdapter = {
  verifyCertificate: jest.fn(),
  revokeCertificate: jest.fn(),
};
const fakeRequireAuth = (req, _res, next) => {
  req.auth = { userId: 'test-user', role: req.headers['x-test-role'] ?? null };
  next();
};

// certificate.repo.js hits a real pool — mocked here (this file has no real
// Postgres dependency) since certificateService.js's verify/revoke paths
// call findByCertificateNumber before ever reaching chainAdapter.
const mockFindByCertificateNumber = jest.fn();
jest.unstable_mockModule('../repositories/certificate.repo.js', () => ({
  findById: jest.fn(),
  findByCertificateNumber: mockFindByCertificateNumber,
  updateStatus: jest.fn(),
}));

const { createCertificatesRouter } = await import('./certificates.routes.js');

const app = express();
app.use(express.json());
app.use('/api/v1/certificates', createCertificatesRouter({ chainAdapter, requireAuth: fakeRequireAuth }));
app.use(errorHandler);

const VALID_PAYLOAD = {
  holderName: 'Asha Verma',
  holderEmail: 'asha@example.com',
  enrollmentNumber: 'SKIT2026CS001',
  title: 'B.Tech in Computer Science',
  certificateType: 'DEGREE',
  course: 'CSE',
  issueDate: '2026-08-01',
};

const CERT_NUMBER = 'SKIT-2026-000000000001';

describe('POST /certificates — validation (issuanceRequestSchema)', () => {
  it('1. valid issuance path — a well-formed payload passes validation (501, not yet implemented)', async () => {
    const res = await request(app).post('/api/v1/certificates').send(VALID_PAYLOAD);
    expect(res.status).toBe(501);
    expect(res.body.code).toBe('E_NOT_IMPLEMENTED');
  });

  it('rejects a payload missing the mandatory holderEmail (FR-ISS-001 / AD-06 matching key)', async () => {
    const { holderEmail, ...withoutEmail } = VALID_PAYLOAD;
    const res = await request(app).post('/api/v1/certificates').send(withoutEmail);
    expect(res.status).toBe(400);
    expect(res.body.fields.some((f) => f.path === 'holderEmail')).toBe(true);
  });

  it('rejects a DEGREE payload carrying a DIPLOMA-only attribute', async () => {
    const res = await request(app)
      .post('/api/v1/certificates')
      .send({ ...VALID_PAYLOAD, attributes: { grade: 'A' } });
    expect(res.status).toBe(400);
  });

  it('accepts a DEGREE payload with its own cgpa attribute', async () => {
    const res = await request(app)
      .post('/api/v1/certificates')
      .send({ ...VALID_PAYLOAD, attributes: { cgpa: 8.7 } });
    expect(res.status).toBe(501);
  });
});

describe('GET /certificates/verify/:certificateNumber', () => {
  it('rejects a malformed certificate number', async () => {
    const res = await request(app).get('/api/v1/certificates/verify/not-a-real-number');
    expect(res.status).toBe(400);
  });

  it('returns NOT_FOUND for a number with no matching DB row (never reaches the chain)', async () => {
    mockFindByCertificateNumber.mockResolvedValueOnce(undefined);
    const res = await request(app).get(`/api/v1/certificates/verify/${CERT_NUMBER}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ certificateNumber: CERT_NUMBER, outcome: 'NOT_FOUND' });
    expect(chainAdapter.verifyCertificate).not.toHaveBeenCalled();
  });

  it('returns the on-chain outcome for a number that does have a DB row', async () => {
    mockFindByCertificateNumber.mockResolvedValueOnce({
      certificate_hash: 'a'.repeat(64),
      title: 'B.Tech',
      holder_name: 'Asha Verma',
    });
    chainAdapter.verifyCertificate.mockResolvedValueOnce('VERIFIED');

    const res = await request(app).get(`/api/v1/certificates/verify/${CERT_NUMBER}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      certificateNumber: CERT_NUMBER,
      outcome: 'VERIFIED',
      title: 'B.Tech',
      holderName: 'Asha Verma',
    });
    expect(chainAdapter.verifyCertificate).toHaveBeenCalledWith(`0x${'a'.repeat(64)}`);
  });
});

describe('POST /certificates/:certificateNumber/revoke', () => {
  it('rejects a non-institution caller with 403', async () => {
    const res = await request(app)
      .post(`/api/v1/certificates/${CERT_NUMBER}/revoke`)
      .set('x-test-role', 'student')
      .send({ reason: 'issued in error, needs correction' });
    expect(res.status).toBe(403);
  });

  it('rejects a missing/too-short reason', async () => {
    const res = await request(app)
      .post(`/api/v1/certificates/${CERT_NUMBER}/revoke`)
      .set('x-test-role', 'institution')
      .send({ reason: 'short' });
    expect(res.status).toBe(400);
  });

  it('maps a chain.adapter AppError straight through to the response', async () => {
    mockFindByCertificateNumber.mockResolvedValueOnce({ certificate_hash: 'b'.repeat(64) });
    chainAdapter.revokeCertificate.mockRejectedValueOnce(new AppError('E_ALREADY_REVOKED', 'Already revoked.'));

    const res = await request(app)
      .post(`/api/v1/certificates/${CERT_NUMBER}/revoke`)
      .set('x-test-role', 'institution')
      .send({ reason: 'duplicate revoke attempt' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('E_ALREADY_REVOKED');
  });

  it('succeeds for a valid institution request', async () => {
    mockFindByCertificateNumber.mockResolvedValueOnce({ certificate_hash: 'c'.repeat(64) });
    chainAdapter.revokeCertificate.mockResolvedValueOnce({ txHash: '0xdeadbeef' });

    const res = await request(app)
      .post(`/api/v1/certificates/${CERT_NUMBER}/revoke`)
      .set('x-test-role', 'institution')
      .send({ reason: 'issued to the wrong student' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ certificateNumber: CERT_NUMBER, txHash: '0xdeadbeef' });
  });
});
