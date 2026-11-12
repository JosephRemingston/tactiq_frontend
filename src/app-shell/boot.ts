import { configureClient } from '@/api/client';
import { config } from '@/config';
import { authActions, onSignOut } from '@/services/auth';
import { queryClientRef } from './AppProviders';

/** One-time wiring of the API client to the auth adapter. Imported by the root layout. */
let booted = false;
export const sessionNotice: { expired: boolean } = { expired: false };

export function boot() {
  if (booted) return;
  booted = true;
  configureClient({
    baseUrl: config.apiUrl,
    getToken: (force) => authActions.getToken(force),
    onUnauthorized: () => {
      sessionNotice.expired = true;
      authActions.signOut().catch(() => {});
    },
  });
  onSignOut(() => {
    queryClientRef.current?.clear();
  });
}
