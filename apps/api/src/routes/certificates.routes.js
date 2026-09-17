import { Router } from 'express';
import { issuanceRequestSchema, certificateIdParamSchema } from '@securecred/shared';
import { getCertificateById } from '../services/certificateService.js';

/**
 * POST /certificates validates the request body (per-certificateType
 * attribute shapes included) and returns 400 with field-level errors on a
 * bad payload. A valid payload still gets 501 — the actual write (hash,
 * persist, allocate certificate number) is wired to a real service once the
 * L3/L4 boundary lands (Week 6+), not this week.
 *
 * GET /certificates/:id now goes through certificateService.js (L3) instead
 * of calling the repository directly — routes stay L1, repositories stay
 * L5, per docs/architecture/layers.md.
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
    res.status(501).json({ status: 'error', code: 'E_NOT_IMPLEMENTED', message: 'Issuance service lands in a later week.' });
  });

  router.get('/:id', async (req, res) => {
    const paramResult = certificateIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({ status: 'error', code: 'E_VALIDATION', message: 'That is not a valid certificate id.' });
      return;
    }

    // Express 4 does not auto-catch a rejected promise from an async
    // handler — an unhandled DB error here would otherwise hang the
    // request instead of responding. Caught explicitly until the app
    // upgrades to Express 5 (or gets a shared async-handler wrapper).
    try {
      const certificate = await getCertificateById(paramResult.data.id);
      if (!certificate) {
        res.status(404).json({ status: 'error', code: 'E_NOT_FOUND', message: 'No certificate found with that id.' });
        return;
      }
      res.status(200).json(certificate);
    } catch {
      res.status(500).json({ status: 'error', code: 'E_INTERNAL', message: 'Something went wrong looking up that certificate.' });
    }
  });

  return router;
}
