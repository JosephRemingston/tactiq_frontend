import { redact } from './redact';

/**
 * App logging. Silent in release builds; in development everything is passed through `redact`
 * first, so tokens, purchase tokens and email addresses never reach the device log.
 */
export const log = {
  warn(message: string, detail?: unknown) {
    if (__DEV__) console.warn(`[tactiq] ${message}`, detail === undefined ? '' : redact(detail));
  },
  info(message: string, detail?: unknown) {
    if (__DEV__) console.log(`[tactiq] ${message}`, detail === undefined ? '' : redact(detail));
  },
};
