import { Router } from 'express';
import { issuanceRequestSchema, certificateIdParamSchema } from '@securecred/shared';
import { getCertificateById } from '../services/certificateService.js';
import { AppError } from '../lib/errors.js';

/**
 * Every failure here goes through AppError + next(err), so error-handler.mw.js
 * is the single place that turns a domain failure into a wire response — no
 * more routes building their own {status:'error',...} object by hand.
 */
export function createCertificatesRouter() {
  const router = Router();

  router.post('/', (req, res, next) => {
    const result = issuanceRequestSchema.safeParse(req.body);
    if (!result.success) {
      next(
        new AppError('E_VALIDATION', 'The issuance request is invalid.', {
          fields: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
        }),
      );
      return;
    }
    next(new AppError('E_NOT_IMPLEMENTED', 'Issuance service lands in a later week.'));
  });

  router.get('/:id', async (req, res, next) => {
    const paramResult = certificateIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      next(new AppError('E_VALIDATION', 'That is not a valid certificate id.'));
      return;
    }

    try {
      const certificate = await getCertificateById(paramResult.data.id);
      if (!certificate) {
        next(new AppError('E_NOT_FOUND', 'No certificate found with that id.'));
        return;
      }
      res.status(200).json(certificate);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
