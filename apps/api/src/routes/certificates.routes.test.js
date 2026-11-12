import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/error-handler.mw.js';
import { AppError } from '../lib/errors.js';

// error-handler.mw.js must be mounted for AppError to reach the client as
// JSON at all — without it, Express's own default handler takes over and
// returns an HTML error page instead.
//
// chainAdapter is a jest.fn()-backed mock throughout this file — no real
// on-chain transaction is submitted by these tests, only the route's own
// wiring/error-mapping behaviour is exercised. requireAuth is a fake
// middleware that trusts an `x-test-role` header instead of doing real
// Clerk verification, since nothing here is testing authentication itself.
const chainAdapter = {
  issueCertificate: jest.fn(),
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

describe('POST /certificates', () => {
  it('1. valid issuance path — a well-formed payload submits a real on-chain transaction (mocked chainAdapter)', async () => {
    chainAdapter.issueCertificate.mockResolvedValueOnce({ txHash: '0xabc123' });

    const res = await request(app).post('/api/v1/certificates').send(VALID_PAYLOAD);

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('PENDING_ANCHOR');
    expect(res.body.txHash).toBe('0xabc123');
    expect(res.body.certificateNumber).toMatch(/^SKIT-2026-[0-9A-HJKMNP-TV-Z]{12}$/);
    expect(chainAdapter.issueCertificate).toHaveBeenCalledWith(expect.stringMatching(/^0x[0-9a-f]{64}$/), '');
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
    chainAdapter.issueCertificate.mockResolvedValueOnce({ txHash: '0xdef456' });
    const res = await request(app)
      .post('/api/v1/certificates')
      .send({ ...VALID_PAYLOAD, attributes: { cgpa: 8.7 } });
    expect(res.status).toBe(202);
  });

  it('propagates a failed on-chain submission as an error response', async () => {
    chainAdapter.issueCertificate.mockRejectedValueOnce(new AppError('E_INTERNAL', 'Chain unavailable.'));
    const res = await request(app).post('/api/v1/certificates').send(VALID_PAYLOAD);
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('E_INTERNAL');
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
