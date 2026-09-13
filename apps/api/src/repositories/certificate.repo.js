/**
 * Raw, parameterized SQL for the `certificate` table. This file (and the
 * rest of repositories/) is the only place permitted to import 'pg'
 * (rule D3 — docs/architecture/layers.md).
 */
import { pool } from './pool.js';

const FULL_COLUMNS_WITH_HOLDER = `
  c.certificate_id, c.student_id, c.institution_id, c.issued_by, c.certificate_number,
  c.title, c.certificate_type, c.issue_date, c.attributes, c.certificate_hash,
  c.template_version, c.blockchain_cert_id, c.status,
  c.created_at, c.updated_at, u.full_name AS holder_name, u.email AS holder_email
`;

/**
 * @param {string} certificateId
 * @returns {Promise<object|undefined>} The row (with holder name/email joined in), or undefined if not found.
 */
export async function findById(certificateId) {
  const { rows } = await pool.query(
    `SELECT ${FULL_COLUMNS_WITH_HOLDER}
     FROM certificate c
     JOIN student s ON s.student_id = c.student_id
     JOIN user_account u ON u.user_id = s.user_id
     WHERE c.certificate_id = $1`,
    [certificateId],
  );
  return rows[0];
}
