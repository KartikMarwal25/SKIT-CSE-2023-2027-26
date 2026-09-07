import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createCertificatesRouter } from './certificates.routes.js';

const app = express();
app.use(express.json());
app.use('/api/v1/certificates', createCertificatesRouter());

const VALID_PAYLOAD = {
  holderName: 'Asha Verma',
  holderEmail: 'asha@example.com',
  enrollmentNumber: 'SKIT2026CS001',
  title: 'B.Tech in Computer Science',
  certificateType: 'DEGREE',
  course: 'CSE',
  issueDate: '2026-08-01',
};

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
