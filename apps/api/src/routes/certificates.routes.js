import { Router } from 'express';
import { issuanceRequestSchema, certificateIdParamSchema } from '@securecred/shared';
import { findById } from '../repositories/certificate.repo.js';

/**
 * POST /certificates validates the request body (per-certificateType
 * attribute shapes included) and returns 400 with field-level errors on a
 * bad payload. A valid payload still gets 501 — the actual write (hash,
 * persist, allocate certificate number) is wired to a real service once the
 * L3/L4 boundary lands (Week 6), not this week.
 *
 * GET /certificates/:id is real this week: it returns the certificate's
 * metadata from the database. Blockchain-derived fields (txHash, ipfsCid)
 * aren't part of this response yet — nothing writes them until the chain
 * adapter exists (much later than Week 5) — so this only returns what the
 * DB actually knows.
 */
export function createCertificatesRouter() {
  const router = Router();

  router.post('/', (req, res) => {
    const result = issuanceRequestSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        status: 'error',
        code: 'E_VALIDATION',
        message: 'The issuance request is invalid.',
        fields: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }
    res.status(501).json({ status: 'error', code: 'E_NOT_IMPLEMENTED', message: 'Issuance service lands in Week 6.' });
  });

  router.get('/:id', async (req, res) => {
    const paramResult = certificateIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({ status: 'error', code: 'E_VALIDATION', message: 'That is not a valid certificate id.' });
      return;
    }

    const certificate = await findById(paramResult.data.id);
    if (!certificate) {
      res.status(404).json({ status: 'error', code: 'E_NOT_FOUND', message: 'No certificate found with that id.' });
      return;
    }

    // `status` here is the certificate's own lifecycle state, not the
    // envelope's success/error marker — success is the 200 itself. Matches
    // the shape in docs/api/certificate-endpoints.md.
    res.status(200).json({
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
    });
  });

  return router;
}
