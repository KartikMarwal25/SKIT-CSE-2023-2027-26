/**
 * IPFS pinning via the Pinata SDK, plus a gateway-failover read path
 * (DP-03: Pinata's own dedicated gateway → ipfs.io → cloudflare-ipfs.com,
 * 5s timeout each, no per-gateway retry — sequential fallthrough only).
 */
import { PinataSDK } from 'pinata';
import { AppError } from '../lib/errors.js';

/**
 * Creates the Pinata/IPFS adapter.
 *
 * @param {object} deps
 * @param {object} deps.config - Frozen app config (uses pinataJwt, pinataGateway, ipfsGateways, ipfsGatewayTimeoutMs).
 * @returns {object} Frozen adapter: `{ pin, fetchByCid }`.
 */
export const createPinataAdapter = ({ config }) => {
  const pinata = new PinataSDK({ pinataJwt: config.pinataJwt, pinataGateway: config.pinataGateway });

  /**
   * Pins a buffer to IPFS.
   *
   * @param {Buffer} buffer
   * @param {string} filename - Used as the uploaded file's name, for traceability in the Pinata dashboard.
   * @returns {Promise<{cid: string}>}
   * @throws {AppError} E_PINATA_FAILED if the upload fails.
   */
  const pin = async (buffer, filename) => {
    try {
      const file = new File([buffer], filename, { type: 'application/pdf' });
      const upload = await pinata.upload.public.file(file);
      return { cid: upload.cid };
    } catch (err) {
      throw new AppError('E_PINATA_FAILED', 'Could not store the certificate document. Please try again.', { cause: err });
    }
  };

  /**
   * Fetches a previously-pinned document by CID, trying each configured
   * gateway in order (DP-03: 5s timeout each). Sequential fallthrough is
   * intentional — each gateway is only worth trying if the previous one
   * already failed.
   *
   * @param {string} cid
   * @returns {Promise<Buffer>}
   * @throws {AppError} E_IPFS_UNAVAILABLE if every gateway fails.
   */
  const fetchByCid = async (cid) => {
    for (const gateway of config.ipfsGateways) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.ipfsGatewayTimeoutMs);
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await fetch(`${gateway.replace(/\/$/, '')}/${cid}`, { signal: controller.signal });
        if (!response.ok) continue;
        // eslint-disable-next-line no-await-in-loop
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch {
        continue; // try the next gateway
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new AppError('E_IPFS_UNAVAILABLE', 'The certificate document is unavailable right now.');
  };

  return Object.freeze({ pin, fetchByCid });
};
