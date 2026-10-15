/**
 * Centralized environment configuration. Loads the repo-root `.env` once at
 * boot; nothing downstream reads `process.env` directly.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../..');

dotenv.config({ path: path.join(REPO_ROOT, '.env') });

/**
 * DP-03's failover order: Pinata's own dedicated gateway first (fastest,
 * what we're paying for), then two public gateways as fallback. The
 * dedicated gateway domain is only meaningful once PINATA_GATEWAY is set;
 * without it, failover just starts from the first public gateway.
 */
const ipfsGateways = [
  ...(process.env.PINATA_GATEWAY ? [`https://${process.env.PINATA_GATEWAY}/ipfs`] : []),
  'https://ipfs.io/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
];

export const config = Object.freeze({
  port: Number(process.env.PORT) || 4000,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://securecred_app:securecred_dev_password@localhost:5432/securecred',
  clerkSecretKey: process.env.CLERK_SECRET_KEY || null,
  pinataJwt: process.env.PINATA_JWT || null,
  pinataGateway: process.env.PINATA_GATEWAY || null,
  ipfsGateways,
  ipfsGatewayTimeoutMs: 5000,
});
