import { getClerkInstance } from '@clerk/expo';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { config } from '@/config';
import { secureStorage } from '@/security/secureStorage';

/**
 * Sign-in adapter. Screens use `useAuth` and `authActions` only. The simulated provider gets
 * Clerk-shaped session tokens from the dev stack's token server, so the backend verifies them
 * exactly as it would a Clerk token. The real Clerk SDK replaces `provider` without screen changes.
 */
export type SignInMethod = 'google' | 'passkey' | 'email';

export interface AuthProvider {
  signIn(method: SignInMethod, email?: string): Promise<{ userKey: string; suggestedName: string | null }>;
  getToken(userKey: string, force: boolean): Promise<string | null>;
  signOut(): Promise<void>;
}

export class SignInError extends Error {
  constructor(
    message: string,
    readonly kind: 'cancelled' | 'failed' | 'network',
  ) {
    super(message);
  }
}

const cache: { token: string | null; exp: number; userKey: string | null } = { token: null, exp: 0, userKey: null };

const simulated: AuthProvider = {
  // Development only. The guards below also let the bundler drop this code from release builds.
  async signIn(method, email) {
    if (!__DEV__) throw new SignInError('Sign-in is not available in this build.', 'failed');
    if (method === 'email') {
      const e = (email ?? '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new SignInError('Enter a valid email address.', 'failed');
      // Lets the error state be reviewed: any address starting with "fail" is rejected.
      if (e.startsWith('fail')) throw new SignInError("We couldn't sign you in with that email. Check the address and try again.", 'failed');
      const local = e.split('@')[0];
      return { userKey: local, suggestedName: local.charAt(0).toUpperCase() + local.slice(1) };
    }
    if (method === 'passkey') return { userKey: 'passkey_fan', suggestedName: 'Passkey fan' };
    return { userKey: 'fan', suggestedName: 'Sam' };
  },
  async getToken(userKey, force) {
    if (!__DEV__) return null;
    const now = Date.now();
    if (!force && cache.userKey === userKey && cache.token && cache.exp - now > 30_000) return cache.token;
    let res: Response;
    try {
      res = await fetch(`${config.devTokenUrl}/dev/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user: userKey }),
      });
    } catch {
      throw new SignInError('Could not reach the sign-in service.', 'network');
    }
    if (!res.ok) return null;
    const j = (await res.json()) as { token: string; expiresAt: string };
    cache.token = j.token;
    cache.exp = Date.parse(j.expiresAt);
    cache.userKey = userKey;
    return j.token;
  },
  async signOut() {
    cache.token = null;
    cache.exp = 0;
    cache.userKey = null;
  },
};

/**
 * Real Clerk. Sign-in itself runs through Clerk's hooks in the sign-in screens (Google SSO and
 * hosted sign-in), which then call `authActions.adoptSession`; this provider supplies session
 * tokens for API calls and signs out.
 */
const clerk: AuthProvider = {
  async signIn() {
    throw new SignInError('Use the sign-in buttons.', 'failed');
  },
  async getToken(_userKey, force) {
    const instance = getClerkInstance({ publishableKey: config.clerkPublishableKey });
    return (await instance.session?.getToken({ skipCache: force })) ?? null;
  },
  async signOut() {
    await getClerkInstance({ publishableKey: config.clerkPublishableKey }).signOut();
  },
};

export const provider: AuthProvider = config.providers.auth === 'clerk' ? clerk : simulated;
export const usingClerk = config.providers.auth === 'clerk';

type AuthState = {
  status: 'signedOut' | 'signedIn';
  userKey: string | null;
  /** Chose "Browse without an account" on Welcome. */
  browsing: boolean;
  /** Users who finished or skipped onboarding on this device. */
  onboarded: string[];
  hydrated: boolean;
};

export const useAuth = create<AuthState>()(
  persist(
    (): AuthState => ({ status: 'signedOut', userKey: null, browsing: false, onboarded: [], hydrated: false }),
    {
      name: 'tactiq.auth',
      // Session state lives in the Keychain / Keystore, not in plain storage.
      storage: secureStorage,
      partialize: (s) => ({ status: s.status, userKey: s.userKey, browsing: s.browsing, onboarded: s.onboarded }) as AuthState,
      onRehydrateStorage: () => () => {
        useAuth.setState({ hydrated: true });
      },
    },
  ),
);

/** Called by the API client and by sign-out. Listeners clear cached data. */
const signOutListeners = new Set<() => void>();
export function onSignOut(fn: () => void) {
  signOutListeners.add(fn);
  return () => signOutListeners.delete(fn);
}

export const authActions = {
  async signIn(method: SignInMethod, email?: string) {
    const r = await provider.signIn(method, email);
    // Fetch a token now so a dead dev stack shows as a sign-in error, not a broken home screen.
    const token = await provider.getToken(r.userKey, true);
    if (!token) throw new SignInError("We couldn't sign you in. Try again.", 'failed');
    useAuth.setState({ status: 'signedIn', userKey: r.userKey, browsing: false });
    return r;
  },
  async signOut() {
    await provider.signOut();
    authActions.markSignedOut();
  },
  /** The session ended elsewhere (Clerk signed out, token revoked): clear local state only. */
  markSignedOut() {
    useAuth.setState({ status: 'signedOut', userKey: null });
    signOutListeners.forEach((fn) => fn());
  },
  /** Clerk created a session (SSO or hosted sign-in): mark the app signed in as that user. */
  adoptSession(userId: string) {
    useAuth.setState({ status: 'signedIn', userKey: userId, browsing: false });
  },
  browse() {
    useAuth.setState({ browsing: true });
  },
  markOnboarded() {
    const { userKey, onboarded } = useAuth.getState();
    if (userKey && !onboarded.includes(userKey)) useAuth.setState({ onboarded: [...onboarded, userKey] });
  },
  async getToken(force: boolean) {
    const { status, userKey } = useAuth.getState();
    if (status !== 'signedIn' || !userKey) return null;
    try {
      return await provider.getToken(userKey, force);
    } catch {
      return null;
    }
  },
};

export function useSignedIn() {
  return useAuth((s) => s.status === 'signedIn');
}
