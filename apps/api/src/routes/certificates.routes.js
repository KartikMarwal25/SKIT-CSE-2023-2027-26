import { Router } from 'express';

/**
 * Route contracts only this week — real implementation (Week 4) wires these
 * to an actual issuance/retrieval service. Both handlers currently respond
 * 501 so the routes are reviewable and callable (for shape-checking against
 * docs/api/certificate-endpoints.md) without pretending they do real work.
 */
export function createCertificatesRouter() {
  const router = Router();

  router.post('/', (req, res) => {
    res.status(501).json({ status: 'error', code: 'E_NOT_IMPLEMENTED', message: 'Issuance lands in Week 4.' });
  });

  router.get('/:id', (req, res) => {
    res.status(501).json({ status: 'error', code: 'E_NOT_IMPLEMENTED', message: 'Retrieval lands in Week 4.' });
  });

  return router;
}
