/**
 * The only module permitted to move `certificate.status` (ADR-009, rule D5
 * — docs/architecture/layers.md). Every other service that needs a
 * certificate's status to change calls transition() here instead of writing
 * the column itself. Enforces the valid-transition table from
 * docs/architecture/certificate-lifecycle.md — a move not in that table
 * throws instead of silently happening.
 *
 * Built this week specifically because verifyCertificate() (Week 9) and
 * revokeCertificate() (Week 10) both now exist on-chain — the next thing
 * that has to happen is wiring their results into `certificate.status`, and
 * this is the one place that's allowed to do it, ahead of that wiring
 * landing so nobody is tempted to call certificateRepo.updateStatus()
 * directly from wherever they happen to be.
 */
import { updateStatus } from '../repositories/certificate.repo.js';
import { AppError } from '../lib/errors.js';

const VALID_TRANSITIONS = {
  PENDING_STORAGE: ['PENDING_ANCHOR', 'FAILED'],
  PENDING_ANCHOR: ['ANCHORING', 'FAILED'],
  ANCHORING: ['ACTIVE', 'FAILED'],
  ACTIVE: ['REVOKING'],
  REVOKING: ['REVOKED'],
  REVOKED: [],
  FAILED: [],
};

/**
 * Moves a certificate from one status to another, enforcing the valid
 * transition table.
 *
 * @param {string} certificateId
 * @param {string} from - Required current status.
 * @param {string} to - Requested new status.
 * @param {object} [extra] - Additional columns to set alongside status (see certificate.repo.js's allow-list).
 * @returns {Promise<object>} The updated certificate row.
 * @throws {AppError} E_ILLEGAL_TRANSITION if `from -> to` isn't in the valid-transition table, or if the compare-and-set missed (the row wasn't actually in `from`).
 */
export async function transition(certificateId, from, to, extra = {}) {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError('E_ILLEGAL_TRANSITION', `Cannot transition a certificate from ${from} to ${to}.`);
  }

  const updated = await updateStatus(certificateId, from, to, extra);
  if (!updated) {
    throw new AppError(
      'E_ILLEGAL_TRANSITION',
      `Certificate is no longer in ${from} — it may have already moved, or the id is wrong.`,
    );
  }
  return updated;
}
