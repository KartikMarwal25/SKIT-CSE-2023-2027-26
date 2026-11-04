/**
 * The composition root. Constructs every concrete adapter/middleware and
 * wires them together, exporting one frozen object app.js consumes. This is
 * the ONLY file (besides tests) allowed to wire concrete implementations
 * together — routes and services take their dependencies as parameters
 * instead of constructing anything themselves.
 *
 * Note on import-boundary rule D4 ("only chain.adapter.js imports 'ethers'"):
 * this composition root necessarily constructs the ethers provider/signer
 * (that's what a composition root is for), but does so via chain.adapter.js's
 * exported `createProvider`/`createWallet`/`createRandomWallet` helpers, so
 * `ethers` itself is still only ever imported from chain.adapter.js.
 */
import { config } from './lib/config.js';
import { createClerkAdapter } from './adapters/clerk.adapter.js';
import { createChainAdapter, createProvider, createWallet, createRandomWallet } from './adapters/chain.adapter.js';
import { createRequireAuth } from './middleware/auth.mw.js';

/**
 * Builds the full dependency graph.
 *
 * @returns {object} Frozen container: `{ chainAdapter, clerkAdapter, requireAuth }`.
 */
export const createContainer = () => {
  const clerkAdapter = createClerkAdapter({ config });
  const requireAuth = createRequireAuth({ clerkAdapter });

  const provider = createProvider(config.chainRpcUrl);
  const signer = config.custodianPrivateKey
    ? createWallet(config.custodianPrivateKey, provider)
    : createRandomWallet(provider);
  const chainAdapter = createChainAdapter({ network: config.chainNetwork, signer });

  return Object.freeze({ chainAdapter, clerkAdapter, requireAuth });
};
