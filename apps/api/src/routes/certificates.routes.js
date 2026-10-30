import { Router } from 'express';
import {
  issuanceRequestSchema,
  certificateIdParamSchema,
  certificateNumberParamSchema,
  revocationRequestSchema,
  ROLE,
} from '@securecred/shared';
import {
  getCertificateById,
  verifyCertificateByNumber,
  revokeCertificateByNumber,
} from '../services/certificateService.js';
import { AppError } from '../lib/errors.js';
import { issuancePerHour, verifyPerMinute, verifyPerHour, revokePerHour } from '../middleware/rateLimits.js';

/**
 * Every failure here goes through AppError + next(err), so error-handler.mw.js
 * is the single place that turns a domain failure into a wire response.
 *
 * GET /verify/:certificateNumber and POST /:certificateNumber/revoke are new
 * this week — both go through chainAdapter (L4), never touching 'ethers'
 * themselves (rule D4). Contract-level errors from a failed revoke are
 * already mapped to this app's error catalogue inside chain.adapter.js —
 * this route only has to next() them.
 */
export function createCertificatesRouter({ chainAdapter, requireAuth }) {
  const router = Router();

  router.post('/', issuancePerHour, (req, res, next) => {
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

  router.get('/verify/:certificateNumber', verifyPerMinute, verifyPerHour, async (req, res, next) => {
    const paramResult = certificateNumberParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      next(new AppError('E_VALIDATION', 'That is not a valid certificate number.'));
      return;
    }

    try {
      const result = await verifyCertificateByNumber(paramResult.data.certificateNumber, chainAdapter);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:certificateNumber/revoke', revokePerHour, requireAuth, async (req, res, next) => {
    if (req.auth.role !== ROLE.INSTITUTION) {
      next(new AppError('E_FORBIDDEN', 'Only an institution account can revoke a certificate.'));
      return;
    }

    const paramResult = certificateNumberParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      next(new AppError('E_VALIDATION', 'That is not a valid certificate number.'));
      return;
    }
    const bodyResult = revocationRequestSchema.safeParse(req.body);
    if (!bodyResult.success) {
      next(
        new AppError('E_VALIDATION', 'A revocation reason is required.', {
          fields: bodyResult.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
        }),
      );
      return;
    }

    try {
      const result = await revokeCertificateByNumber(
        paramResult.data.certificateNumber,
        bodyResult.data.reason,
        chainAdapter,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
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
