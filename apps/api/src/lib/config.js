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

export const config = Object.freeze({
  port: Number(process.env.PORT) || 4000,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://securecred_app:securecred_dev_password@localhost:5432/securecred',
});
