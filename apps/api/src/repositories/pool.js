/**
 * The single pg.Pool for the whole API process. This file (and every other
 * module under repositories/) is the only place permitted to import 'pg'
 * (rule D3 — see docs/architecture/layers.md) — no ORM, hand-written
 * parameterized SQL only, kept in one repository module per table.
 */
import pg from 'pg';
import { config } from '../lib/config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });
