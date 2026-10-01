/**
 * The ONLY module in this codebase permitted to import 'ethers' (rule D4 —
 * docs/architecture/layers.md). Loads the ABI + deployed address for a
 * network from contracts/deployments/<network>.json (Kartik's Week 8 deploy
 * script writes this file) rather than hardcoding either.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// adapters -> src -> apps/api -> apps -> <repo root>
const REPO_ROOT = path.resolve(__dirname, '../../../..');

/**
 * @param {string} network
 * @returns {{address: string, abi: unknown[]}}
 * @throws {Error} If no deployment record exists for that network yet.
 */
const loadDeployment = (network) => {
  const file = path.join(REPO_ROOT, 'contracts', 'deployments', `${network}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Contract not deployed for network "${network}" — run the deploy script first.`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

/**
 * Creates the on-chain adapter. Deployment resolution is lazy (not done at
 * construction time) so an undeployed network doesn't crash adapter
 * creation, only the specific call that needs it.
 *
 * @param {object} deps
 * @param {string} deps.network - Matches a contracts/deployments/<network>.json filename.
 * @param {import('ethers').Signer} deps.signer - Provider-connected signer for writes.
 * @returns {object} Frozen adapter: `{ issueCertificate }`.
 */
export const createChainAdapter = ({ network, signer }) => {
  let cached = null;
  const getContract = () => {
    if (!cached) {
      const deployment = loadDeployment(network);
      cached = new ethers.Contract(deployment.address, deployment.abi, signer);
    }
    return cached;
  };

  /**
   * Issues a certificate on-chain. Does not await confirmation — confirmation
   * tracking is the worker's job (not built yet).
   *
   * @param {string} certificateHash - 32-byte hex-encoded hash, `0x`-prefixed.
   * @param {string} ipfsCid
   * @returns {Promise<{txHash: string}>}
   */
  const issueCertificate = async (certificateHash, ipfsCid) => {
    const contract = getContract();
    const tx = await contract.issueCertificate(certificateHash, ipfsCid);
    return { txHash: tx.hash };
  };

  return Object.freeze({ issueCertificate });
};
