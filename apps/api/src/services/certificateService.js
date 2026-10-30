/**
 * L3 service layer for certificate reads/verification/revocation. Routes
 * (L1) call this, not repositories (L5) or chain.adapter.js (L4) directly —
 * the ports-and-adapters boundary from docs/architecture/layers.md.
 * Certificate.status (the DB column) is never written here; that's
 * lifecycleService's job alone (rule D5) — verifyCertificate/
 * revokeCertificate below only ever touch the on-chain state, never the DB
 * row's status column.
 */
import { findById, findByCertificateNumber } from '../repositories/certificate.repo.js';
import { AppError } from '../lib/errors.js';

const toBytes32 = (hexHash) => `0x${hexHash}`;

/**
 * @param {string} certificateId
 * @returns {Promise<object|undefined>} A view-shaped certificate, or
 *   undefined if no certificate exists with that id.
 */
export async function getCertificateById(certificateId) {
  const certificate = await findById(certificateId);
  if (!certificate) {
    return undefined;
  }

  return {
    certificateId: certificate.certificate_id,
    certificateNumber: certificate.certificate_number,
    title: certificate.title,
    certificateType: certificate.certificate_type,
    issueDate: certificate.issue_date,
    status: certificate.status,
    holderName: certificate.holder_name,
    holderEmail: certificate.holder_email,
    certificateHash: certificate.certificate_hash,
    attributes: certificate.attributes,
  };
}

/**
 * Looks up a certificate by its public number and reports its live on-chain
 * verification outcome (FR-VER-003). Unknown certificate numbers are
 * NOT_FOUND, same as an unknown on-chain hash would be — the two cases are
 * indistinguishable to a caller who only has a number to type in.
 *
 * @param {string} certificateNumber
 * @param {object} chainAdapter - chain.adapter.js's `{ verifyCertificate }`.
 * @returns {Promise<{certificateNumber: string, outcome: string, title?: string, holderName?: string}>}
 */
export async function verifyCertificateByNumber(certificateNumber, chainAdapter) {
  const certificate = await findByCertificateNumber(certificateNumber);
  if (!certificate) {
    return { certificateNumber, outcome: 'NOT_FOUND' };
  }

  const outcome = await chainAdapter.verifyCertificate(toBytes32(certificate.certificate_hash));
  return {
    certificateNumber,
    outcome,
    title: certificate.title,
    holderName: certificate.holder_name,
  };
}

/**
 * Revokes a certificate by its public number.
 *
 * @param {string} certificateNumber
 * @param {string} reason
 * @param {object} chainAdapter - chain.adapter.js's `{ revokeCertificate }`.
 * @returns {Promise<{certificateNumber: string, txHash: string}>}
 * @throws {AppError} E_NOT_FOUND if no certificate has that number; otherwise whatever chain.adapter.js's revokeCertificate throws (already mapped to this app's error catalogue).
 */
export async function revokeCertificateByNumber(certificateNumber, reason, chainAdapter) {
  const certificate = await findByCertificateNumber(certificateNumber);
  if (!certificate) {
    throw new AppError('E_NOT_FOUND', 'No certificate found with that number.');
  }

  const { txHash } = await chainAdapter.revokeCertificate(toBytes32(certificate.certificate_hash), reason);
  return { certificateNumber, txHash };
}
