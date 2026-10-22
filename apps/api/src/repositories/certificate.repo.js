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

const FULL_COLUMNS = `
  certificate_id, student_id, institution_id, issued_by, certificate_number,
  title, certificate_type, issue_date, attributes, certificate_hash,
  template_version, blockchain_cert_id, status, failure_cause,
  created_at, updated_at
`;

/** Allow-list of columns updateStatus is permitted to set alongside status. */
const UPDATABLE_EXTRA_COLUMNS = new Set(['failure_cause', 'blockchain_cert_id']);

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

/**
 * Compare-and-set status transition. The ONLY intended caller is
 * lifecycleService.js (ADR-009, rule D5) — every other module that needs a
 * certificate's status to change goes through lifecycleService.transition()
 * instead of calling this directly.
 *
 * @param {string} certificateId
 * @param {string} from - Required current status; the update only applies if this still matches.
 * @param {string} to - New status.
 * @param {object} [extra] - Additional columns to set, keys from UPDATABLE_EXTRA_COLUMNS only.
 * @returns {Promise<object|undefined>} The updated row, or undefined if the compare-and-set missed (lost race / wrong state).
 */
export async function updateStatus(certificateId, from, to, extra = {}) {
  const setClauses = ['status = $1', 'updated_at = now()'];
  const values = [to];

  for (const [key, value] of Object.entries(extra)) {
    if (!UPDATABLE_EXTRA_COLUMNS.has(key)) {
      throw new Error(`updateStatus: column "${key}" is not in the update allow-list`);
    }
    values.push(value);
    setClauses.push(`${key} = $${values.length}`);
  }

  values.push(certificateId, from);
  const { rows } = await pool.query(
    `UPDATE certificate SET ${setClauses.join(', ')}
     WHERE certificate_id = $${values.length - 1} AND status = $${values.length}
     RETURNING ${FULL_COLUMNS}`,
    values,
  );
  return rows[0];
}
