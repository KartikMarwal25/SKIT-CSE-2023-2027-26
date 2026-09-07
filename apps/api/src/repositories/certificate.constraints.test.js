import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../../db/migrations');
const SCHEMA = 'weeklywork_w4_certificate_constraints_test';
const MIGRATION_FILES = [
  '001_extensions_and_roles.sql',
  '002_create_institution.sql',
  '003_create_user_account.sql',
  '004_create_student.sql',
  '005_create_certificate.sql',
];

// A dedicated, elevated connection for test setup only — separate from the
// app's own least-privilege pool.js (securecred_app, granted by
// db/migrations/013_app_role_and_privileges.sql), which cannot CREATE
// SCHEMA. Mirrors db/migrate.js's own use of a superuser connection to
// apply migrations. Override via TEST_DATABASE_URL if the local Postgres
// superuser credentials differ from the docker-compose default.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/securecred';

/**
 * Runs the real migrations (001-005) inside a throwaway schema, using one
 * dedicated client for the whole suite so `search_path` stays put across
 * queries (a pooled connection can otherwise land on a different underlying
 * connection each call, which would silently drop back to `public`).
 *
 * This exercises the actual certificate_number / certificate_hash UNIQUE
 * constraints from db/migrations/005_create_certificate.sql without ever
 * touching the app's real `public` schema or its data.
 */
let client;
let institutionId;
let issuerUserId;
let studentId;

beforeAll(async () => {
  client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  await client.query(`CREATE SCHEMA ${SCHEMA}`);
  await client.query(`SET search_path TO ${SCHEMA}`);

  for (const file of MIGRATION_FILES) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await client.query(sql);
  }

  const institutionRow = await client.query(
    `INSERT INTO institution (institution_name, institution_code, email)
     VALUES ('SKIT', 'SKIT', 'admin@skit.ac.in') RETURNING institution_id`
  );
  institutionId = institutionRow.rows[0].institution_id;

  const institutionRoleId = (
    await client.query(`SELECT role_id FROM role WHERE role_name = 'institution'`)
  ).rows[0].role_id;
  const studentRoleId = (
    await client.query(`SELECT role_id FROM role WHERE role_name = 'student'`)
  ).rows[0].role_id;

  const issuerRow = await client.query(
    `INSERT INTO user_account (role_id, institution_id, clerk_user_id, full_name, email)
     VALUES ($1, $2, 'clerk_test_issuer', 'Registrar', 'registrar@skit.ac.in') RETURNING user_id`,
    [institutionRoleId, institutionId]
  );
  issuerUserId = issuerRow.rows[0].user_id;

  const studentUserRow = await client.query(
    `INSERT INTO user_account (role_id, clerk_user_id, full_name, email)
     VALUES ($1, 'clerk_test_student', 'Asha Verma', 'asha@example.com') RETURNING user_id`,
    [studentRoleId]
  );
  const studentRow = await client.query(
    `INSERT INTO student (user_id, institution_id, enrollment_number, course)
     VALUES ($1, $2, 'SKIT2026CS001', 'CSE') RETURNING student_id`,
    [studentUserRow.rows[0].user_id, institutionId]
  );
  studentId = studentRow.rows[0].student_id;
});

afterAll(async () => {
  await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  await client.end();
});

function insertCertificate({ certificateNumber, certificateHash }) {
  return client.query(
    `INSERT INTO certificate
       (student_id, institution_id, issued_by, certificate_number, title,
        certificate_type, issue_date, certificate_hash, template_version)
     VALUES ($1, $2, $3, $4, 'B.Tech in Computer Science', 'DEGREE', CURRENT_DATE, $5, 'v1')`,
    [studentId, institutionId, issuerUserId, certificateNumber, certificateHash]
  );
}

describe('certificate table constraints (db/migrations/005_create_certificate.sql)', () => {
  it('1. valid issuance path — a well-formed certificate row inserts cleanly', async () => {
    await expect(
      insertCertificate({
        certificateNumber: 'SKIT-2026-000000000001',
        certificateHash: 'a'.repeat(64),
      })
    ).resolves.toMatchObject({ rowCount: 1 });
  });

  it('2. duplicate-ID rejection — a repeated certificate_number is rejected', async () => {
    await insertCertificate({ certificateNumber: 'SKIT-2026-000000000002', certificateHash: 'b'.repeat(64) });

    await expect(
      insertCertificate({ certificateNumber: 'SKIT-2026-000000000002', certificateHash: 'c'.repeat(64) })
    ).rejects.toMatchObject({ code: '23505', constraint: expect.stringContaining('certificate_number') });
  });

  it('3. duplicate-ID rejection — a repeated certificate_hash is rejected even with a different number', async () => {
    await insertCertificate({ certificateNumber: 'SKIT-2026-000000000003', certificateHash: 'd'.repeat(64) });

    await expect(
      insertCertificate({ certificateNumber: 'SKIT-2026-000000000004', certificateHash: 'd'.repeat(64) })
    ).rejects.toMatchObject({ code: '23505', constraint: expect.stringContaining('certificate_hash') });
  });

  // Blocked: no auth middleware exists yet in this build (Clerk-based
  // role/session enforcement is real, later project work — not part of the
  // weekly-work strand at this point in the calendar). Nothing today can
  // reject an unauthorised issuer, at the DB layer or the API layer, so this
  // stays skipped rather than pretending otherwise.
  it.skip('4. unauthorised-issuer rejection — blocked pending auth middleware', () => {});
});
