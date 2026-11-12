import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { ethers } from 'ethers';
import request from 'supertest';

/**
 * Executes the executable subset of Week 13's tamper-detection-adjacent
 * plan against the REAL GET /certificates/verify/:certificateNumber
 * endpoint — not mocked. A real isolated Postgres schema (dropped after)
 * and the real deployed Ganache contract (contracts/deployments/ganache.json
 * — the same one Kartik's deploy script writes) together, exactly like a
 * certificate number typed into the verifier portal would hit.
 *
 * Requires a local Ganache instance already running with the contract
 * deployed (`npm run ganache` + `npm run deploy:ganache` in contracts/) —
 * skipped automatically if neither is available, rather than failing the
 * whole suite when this file runs somewhere without that local setup.
 *
 * Cases 3-7 from tamper-detection-test-plan.md (the actual TAMPERED cases)
 * are NOT executed here — they need the document-upload endpoint, which
 * still doesn't exist (§5.5/UX-OPEN-3). What IS executed: cases 1, 2, and 8
 * — the parts of that plan that don't depend on upload, run for real
 * against a live stack instead of asserted against mocks.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../../db/migrations');
const DEPLOYMENT_FILE = path.resolve(__dirname, '../../../../contracts/deployments/ganache.json');
const SCHEMA = 'weeklywork_w14_verify_integration_test';
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/securecred';
// Ganache's well-known deterministic account #1 private key (--deterministic mode).
const ISSUER_PRIVATE_KEY = '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1';
const OWNER_PRIVATE_KEY = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';

const ganacheAvailable = fs.existsSync(DEPLOYMENT_FILE);
const describeIfGanache = ganacheAvailable ? describe : describe.skip;

let dbClient;
let app;
let studentId, institutionId, issuerUserId;
let activeNumber, revokedNumber;

async function seedFixtures() {
  const institutionRow = await dbClient.query(
    `INSERT INTO institution (institution_name, institution_code, email)
     VALUES ('SKIT', 'SKIT', 'admin@skit.ac.in') RETURNING institution_id`,
  );
  institutionId = institutionRow.rows[0].institution_id;

  const institutionRoleId = (await dbClient.query(`SELECT role_id FROM role WHERE role_name = 'institution'`)).rows[0].role_id;
  const studentRoleId = (await dbClient.query(`SELECT role_id FROM role WHERE role_name = 'student'`)).rows[0].role_id;

  const issuerRow = await dbClient.query(
    `INSERT INTO user_account (role_id, institution_id, clerk_user_id, full_name, email)
     VALUES ($1, $2, 'clerk_test_issuer', 'Registrar', 'registrar@skit.ac.in') RETURNING user_id`,
    [institutionRoleId, institutionId],
  );
  issuerUserId = issuerRow.rows[0].user_id;

  const studentUserRow = await dbClient.query(
    `INSERT INTO user_account (role_id, clerk_user_id, full_name, email)
     VALUES ($1, 'clerk_test_student', 'Asha Verma', 'asha@example.com') RETURNING user_id`,
    [studentRoleId],
  );
  const studentRow = await dbClient.query(
    `INSERT INTO student (user_id, institution_id, enrollment_number, course)
     VALUES ($1, $2, 'SKIT2026CS001', 'CSE') RETURNING student_id`,
    [studentUserRow.rows[0].user_id, institutionId],
  );
  studentId = studentRow.rows[0].student_id;
}

async function insertCertificate(certificateNumber, certificateHash) {
  await dbClient.query(
    `INSERT INTO certificate
       (student_id, institution_id, issued_by, certificate_number, title,
        certificate_type, issue_date, certificate_hash, template_version)
     VALUES ($1, $2, $3, $4, 'B.Tech in Computer Science', 'DEGREE', CURRENT_DATE, $5, 'v1')`,
    [studentId, institutionId, issuerUserId, certificateNumber, certificateHash],
  );
}

describeIfGanache('GET /certificates/verify/:certificateNumber — real integration (Week 13 plan, cases 1/2/8)', () => {
  beforeAll(async () => {
    dbClient = new pg.Client({ connectionString: TEST_DATABASE_URL });
    await dbClient.connect();
    await dbClient.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await dbClient.query(`CREATE SCHEMA ${SCHEMA}`);
    await dbClient.query(`SET search_path TO ${SCHEMA}`);
    for (const file of [
      '001_extensions_and_roles.sql',
      '002_create_institution.sql',
      '003_create_user_account.sql',
      '004_create_student.sql',
      '005_create_certificate.sql',
    ]) {
      await dbClient.query(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
    }
    await seedFixtures();

    const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, 'utf8'));
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
    const owner = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
    const issuer = new ethers.Wallet(ISSUER_PRIVATE_KEY, provider);
    const ownerContract = new ethers.Contract(deployment.address, deployment.abi, owner);
    const issuerContract = new ethers.Contract(deployment.address, deployment.abi, issuer);

    await (await ownerContract.registerIssuer(issuer.address)).wait();

    const hashActive = ethers.keccak256(ethers.toUtf8Bytes(`w14-active-${Date.now()}`));
    const hashRevoked = ethers.keccak256(ethers.toUtf8Bytes(`w14-revoked-${Date.now()}`));
    await (await issuerContract.issueCertificate(hashActive, 'cid-active')).wait();
    await (await issuerContract.issueCertificate(hashRevoked, 'cid-revoked')).wait();
    await (await issuerContract.revokeCertificate(hashRevoked, 'issued in error')).wait();

    activeNumber = 'SKIT-2026-000000000101';
    revokedNumber = 'SKIT-2026-000000000102';
    await insertCertificate(activeNumber, hashActive.slice(2));
    await insertCertificate(revokedNumber, hashRevoked.slice(2));

    process.env.CHAIN_NETWORK = 'ganache';
    process.env.CHAIN_RPC_URL = 'http://127.0.0.1:7545';
    process.env.DATABASE_URL = `${TEST_DATABASE_URL}?options=-c%20search_path%3D${SCHEMA}`;

    const { createApp } = await import('../app.js');
    app = createApp();
  });

  afterAll(async () => {
    if (dbClient) {
      await dbClient.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
      await dbClient.end();
    }
  });

  it('case 1: a genuine, active certificate is VERIFIED', async () => {
    const res = await request(app).get(`/api/v1/certificates/verify/${activeNumber}`);
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('VERIFIED');
  });

  it('case 2: a genuine but revoked certificate is REVOKED, not VERIFIED', async () => {
    const res = await request(app).get(`/api/v1/certificates/verify/${revokedNumber}`);
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('REVOKED');
  });

  it('case 8: a certificate number with no DB row is NOT_FOUND, never reaching the chain', async () => {
    const res = await request(app).get('/api/v1/certificates/verify/SKIT-2026-000000000999');
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('NOT_FOUND');
  });
});

if (!ganacheAvailable) {
  describe('GET /certificates/verify/:certificateNumber — real integration', () => {
    it.skip('TODO: needs a local Ganache instance with the contract deployed (npm run ganache && npm run deploy:ganache in contracts/)', () => {});
  });
}
