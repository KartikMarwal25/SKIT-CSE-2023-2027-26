/**
 * The one and only error type this codebase is permitted to throw
 * deliberately for a domain failure — error-handler.mw.js maps anything else
 * (a bug, a driver throwing a native Error) to E_INTERNAL.
 */
import { ERROR_STATUS, ERROR_CODE } from '@securecred/shared';

export class AppError extends Error {
  /**
   * @param {string} code - One of @securecred/shared's ERROR_CODE values.
   * @param {string} message - Human-readable message. May cross the wire, so it
   *   must never embed secrets, stack traces, or internal identifiers.
   * @param {object} [options]
   * @param {number} [options.status] - HTTP status override (defaults to ERROR_STATUS[code] or 500).
   * @param {Array<{path:string, message:string}>} [options.fields] - Field-level validation errors, safe to send.
   */
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = options.status ?? ERROR_STATUS[code] ?? 500;
    this.fields = options.fields;
    Error.captureStackTrace?.(this, AppError);
  }
}

/**
 * Converts any thrown error into the minimal shape allowed across the wire.
 * A correlation id isn't part of this yet — no request-id middleware exists
 * in this build — so this stays a smaller shape than the eventual one.
 *
 * @param {unknown} err - The caught error (AppError or otherwise).
 * @returns {{status:'error', code:string, message:string, fields?:Array}}
 */
export const toWire = (err) => {
  if (err instanceof AppError) {
    const wire = { status: 'error', code: err.code, message: err.message };
    if (err.fields) wire.fields = err.fields;
    return wire;
  }
  return { status: 'error', code: 'E_INTERNAL', message: 'An unexpected error occurred.' };
};
