/**
 * Proves the pg connection layer actually works — a single parameterless
 * query with no dependency on any real schema, since no tables exist yet.
 */
import { pool } from './pool.js';

export async function ping() {
  const result = await pool.query('SELECT 1 AS ok');
  return result.rows[0].ok === 1;
}
