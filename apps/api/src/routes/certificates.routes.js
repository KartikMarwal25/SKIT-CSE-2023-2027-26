import { Router } from 'express';
import { issuanceRequestSchema } from '@securecred/shared';

/**
 * POST /certificates now validates the request body (per-certificateType
 * attribute shapes included) and returns 400 with field-level errors on a
 * bad payload. A valid payload still gets 501 — the actual write (hash,
 * persist, allocate certificate number) is wired to a real service once the
 * L3/L4 boundary lands (Week 6), not this week.
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

  router.get('/:id', (req, res) => {
    res.status(501).json({ status: 'error', code: 'E_NOT_IMPLEMENTED', message: 'Retrieval lands in Week 5.' });
  });

  return router;
}
