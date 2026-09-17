/**
 * L3 service layer for certificate reads. Routes (L1) call this, not
 * repositories (L5) directly — the ports-and-adapters boundary from
 * docs/architecture/layers.md. Certificate.status is never written here;
 * that's lifecycleService's job alone (rule D5), and this module is
 * read-only anyway.
 */
import { findById } from '../repositories/certificate.repo.js';

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
