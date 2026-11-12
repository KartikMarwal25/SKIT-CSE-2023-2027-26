/**
 * Wires the issuance request through to a real on-chain transaction. Scoped
 * narrowly this week to "submit a real on-chain issuance transaction" —
 * literally this week's task — not the full pipeline. Two pieces are
 * honestly still missing, not silently skipped:
 *
 * 1. No PDF generation exists yet, so `certificateHash` is computed over the
 *    validated request JSON as a stand-in "document" — once a real PDF
 *    adapter exists, this hashes the actual generated file instead.
 * 2. No DB persistence happens here yet. The real pipeline is
 *    persist-before-external-call (insert a PENDING_STORAGE row, then call
 *    the chain) — but resolving holderEmail into a real student_id/
 *    institution_id needs auth + institution lookup, neither of which is
 *    wired to this route yet. That's the next piece, not built this week.
 */
import { allocateCertificateNumber } from '../lib/certId.js';
import { sha256Hex } from '../lib/hash.js';

// Temporary placeholder pending real auth + institution resolution on this
// route (see the module comment above) — every certificate issued through
// this path is attributed to the project's one demo institution until then.
const PLACEHOLDER_INSTITUTION_CODE = 'SKIT';

/**
 * @param {object} request - A validated issuanceRequestSchema payload.
 * @param {object} chainAdapter - chain.adapter.js's `{ issueCertificate }`.
 * @returns {Promise<{certificateNumber: string, certificateHash: string, txHash: string}>}
 */
export async function issueCertificate(request, chainAdapter) {
  const certificateHash = sha256Hex(JSON.stringify(request));
  const issueYear = new Date(request.issueDate).getFullYear();
  const certificateNumber = allocateCertificateNumber(PLACEHOLDER_INSTITUTION_CODE, issueYear);

  const { txHash } = await chainAdapter.issueCertificate(`0x${certificateHash}`, '');

  return { certificateNumber, certificateHash, txHash };
}
