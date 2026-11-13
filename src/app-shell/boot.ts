import { configureClient } from '@/api/client';
import { lastError } from '@/api/errors';
import { config } from '@/config';
import { releaseProblems } from '@/security/release';
import { resetAdSession } from '@/services/ads';
import { authActions, onSignOut } from '@/services/auth';
import { queryClientRef } from './AppProviders';

/** One-time wiring of the API client to the auth adapter. Imported by the root layout. */
let booted = false;
export const sessionNotice: { expired: boolean } = { expired: false };

/**
 * Reasons this build must not run (empty in development and in a correct release): no HTTPS
 * API address, no Clerk key, or the simulated sign-in. The root layout shows a blocking screen.
 */
export const buildProblems = releaseProblems({
  isDev: __DEV__,
  apiUrl: config.apiUrl,
  clerkPublishableKey: config.clerkPublishableKey,
  authProvider: config.providers.auth,
});

export function boot() {
  if (booted) return;
  booted = true;
  configureClient({
    baseUrl: config.apiUrl,
    isDev: __DEV__,
    getToken: (force) => authActions.getToken(force),
    onUnauthorized: () => {
      sessionNotice.expired = true;
      authActions.signOut().catch(() => {});
    },
  });
  // Nothing from one account may be left for the next: cached API data, the last error
  // reference shown in "Report a problem", and the ad session counters.
  onSignOut(() => {
    queryClientRef.current?.clear();
    lastError.current = null;
    resetAdSession();
  });
}
