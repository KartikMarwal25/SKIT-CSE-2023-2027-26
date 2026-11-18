/**
 * The ONLY module in this codebase permitted to import 'ethers' (rule D4 —
 * docs/architecture/layers.md). Loads the ABI + deployed address for a
 * network from contracts/deployments/<network>.json (Kartik's deploy script
 * writes this file) rather than hardcoding either.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ethers } from 'ethers';
import { AppError } from '../lib/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// adapters -> src -> apps/api -> apps -> <repo root>
const REPO_ROOT = path.resolve(__dirname, '../../../..');

const VERIFICATION_OUTCOME_NAMES = ['VERIFIED', 'REVOKED', 'TAMPERED', 'NOT_FOUND'];

// FR-VER-006: a verify call that can't reach the chain within a reasonable
// window must fail distinctly from "we asked and got an answer" — 8s is
// generous for a single read call (well under the 20s+ Pinata gateway
// timeout elsewhere in this codebase, since a stalled RPC here should fail
// fast enough for the verifier portal to show its degraded state promptly).
const VERIFY_TIMEOUT_MS = 8000;

/** Maps the contract's own custom errors to this app's error catalogue. */
const REVOKE_ERROR_MAP = {
  NotIssuer: () => new AppError('E_FORBIDDEN', 'You are not a registered issuer.'),
  CertificateNotFound: () => new AppError('E_NOT_FOUND', 'No certificate found with that hash.'),
  AlreadyRevoked: () => new AppError('E_ALREADY_REVOKED', 'This certificate has already been revoked.'),
  EmptyReason: () => new AppError('E_VALIDATION', 'A revocation reason is required.'),
};

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
 * Races a promise against a timeout, rejecting with a distinct error if the
 * promise doesn't settle in time.
 *
 * @param {Promise<unknown>} promise
 * @param {number} ms
 * @returns {Promise<unknown>}
 */
const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('chain call timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Creates a JSON-RPC provider. The sole entry point other modules use to get
 * an ethers provider without importing 'ethers' themselves (rule D4).
 *
 * @param {string} rpcUrl
 * @returns {import('ethers').JsonRpcProvider}
 */
export const createProvider = (rpcUrl) => new ethers.JsonRpcProvider(rpcUrl);

/**
 * Wraps a raw private key into a provider-connected wallet.
 *
 * @param {string} privateKey
 * @param {import('ethers').Provider} provider
 * @returns {import('ethers').Wallet}
 */
export const createWallet = (privateKey, provider) => new ethers.Wallet(privateKey, provider);

/**
 * Generates a fresh, provider-connected ephemeral wallet — the dev-only
 * fallback when no CUSTODIAN_PRIVATE_KEY is configured. Fine for read calls
 * (verifyCertificate); a write from a brand-new unfunded wallet will fail
 * for lack of gas, which is an acceptable "not configured yet" failure mode
 * in dev rather than a silent no-op.
 *
 * @param {import('ethers').Provider} provider
 * @returns {import('ethers').Wallet}
 */
export const createRandomWallet = (provider) => ethers.Wallet.createRandom().connect(provider);

/**
 * Creates the on-chain adapter. Deployment resolution is lazy (not done at
 * construction time) so an undeployed network doesn't crash adapter
 * creation, only the specific call that needs it.
 *
 * @param {object} deps
 * @param {string} deps.network - Matches a contracts/deployments/<network>.json filename.
 * @param {import('ethers').Signer} deps.signer - Provider-connected signer for writes (also used for reads).
 * @returns {object} Frozen adapter: `{ issueCertificate, verifyCertificate, revokeCertificate }`.
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

  /**
   * Looks up a certificate's on-chain verification outcome (FR-VER-003).
   * The contract's own verifyCertificate() never reverts for a normal
   * lookup — but the RPC call itself can still fail or hang if the chain is
   * unreachable, which is exactly what FR-VER-006's degraded state is for.
   * That failure is surfaced as a distinct, mapped error rather than an
   * unhandled rejection.
   *
   * @param {string} certificateHash
   * @returns {Promise<'VERIFIED'|'REVOKED'|'TAMPERED'|'NOT_FOUND'>}
   * @throws {AppError} E_CHAIN_UNAVAILABLE if the chain doesn't respond within VERIFY_TIMEOUT_MS or the call otherwise fails.
   */
  const verifyCertificate = async (certificateHash) => {
    const contract = getContract();
    try {
      const outcome = await withTimeout(contract.verifyCertificate(certificateHash), VERIFY_TIMEOUT_MS);
      return VERIFICATION_OUTCOME_NAMES[Number(outcome)];
    } catch (err) {
      throw new AppError('E_CHAIN_UNAVAILABLE', 'The blockchain is not responding right now.', { cause: err });
    }
  };

  /**
   * Revokes a certificate on-chain. Does not await confirmation.
   *
   * @param {string} certificateHash
   * @param {string} reason
   * @returns {Promise<{txHash: string}>}
   * @throws {AppError} Mapped from the contract's own custom error — see REVOKE_ERROR_MAP.
   */
  const revokeCertificate = async (certificateHash, reason) => {
    const contract = getContract();
    try {
      const tx = await contract.revokeCertificate(certificateHash, reason);
      return { txHash: tx.hash };
    } catch (err) {
      // Where the ABI-encoded revert data actually lives depends on the
      // provider: Hardhat's own network puts it at err.data, but a real
      // JSON-RPC node (Ganache, and presumably any real chain) nests it one
      // level deeper at err.info.error.data.result — found by testing this
      // against a real deployed Ganache instance, where err.data came back
      // null and parseError() failed until this fallback chain was added.
      const data = err.data ?? err.info?.error?.data?.result ?? err.info?.error?.data ?? '';
      const parsed = data ? contract.interface.parseError(data) : null;
      const mapper = parsed && REVOKE_ERROR_MAP[parsed.name];
      if (mapper) throw mapper();
      throw new AppError('E_INTERNAL', 'Could not revoke this certificate on-chain.', { cause: err });
    }
  };

  return Object.freeze({ issueCertificate, verifyCertificate, revokeCertificate });
};
