import { ClerkProvider, getClerkInstance, useAuth as useClerkAuth, useSSO } from '@clerk/expo';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import { tokenCache } from '@clerk/expo/token-cache';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, type ReactNode } from 'react';

import { config } from '@/config';
import { authActions, SignInError, useAuth, usingClerk } from './auth';

// Completes a browser auth session when the app is reopened by the redirect.
WebBrowser.maybeCompleteAuthSession();

/**
 * Where Clerk sends the browser back to. Explicit so it works in Expo Go (exp://…) as well as in
 * builds (tactiq://auth-callback); Clerk's default Android callback needs a rebuilt native project.
 * This URL must be allowed in the Clerk Dashboard (Native applications → redirect URLs).
 */
export function clerkRedirectUrl() {
  return AuthSession.makeRedirectUri({ scheme: 'tactiq', path: 'auth-callback' });
}

/** Keeps the app's session store in step with Clerk's session. */
function ClerkBridge() {
  const { isLoaded, isSignedIn, userId } = useClerkAuth();
  const status = useAuth((s) => s.status);
  const userKey = useAuth((s) => s.userKey);
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && userId && (status !== 'signedIn' || userKey !== userId)) authActions.adoptSession(userId);
    if (!isSignedIn && status === 'signedIn') authActions.markSignedOut();
  }, [isLoaded, isSignedIn, userId, status, userKey]);
  return null;
}

/** Wraps the app in ClerkProvider when a publishable key is configured. */
export function AuthRoot({ children }: { children: ReactNode }) {
  if (!usingClerk) return <>{children}</>;
  return (
    <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkBridge />
      {children}
    </ClerkProvider>
  );
}

/** Sign-in actions backed by Clerk. Only call inside AuthRoot when `usingClerk`. */
export function useClerkSignIn() {
  const { startSSOFlow } = useSSO();
  const { startHostedAuth } = useHostedAuth();

  const adopt = () => {
    const id = getClerkInstance({ publishableKey: config.clerkPublishableKey }).user?.id;
    if (!id) throw new SignInError("We couldn't finish signing you in. Try again.", 'failed');
    authActions.adoptSession(id);
  };

  return {
    /** Google through Clerk's browser OAuth flow (works in Expo Go). */
    async google() {
      const r = await startSSOFlow({ strategy: 'oauth_google', redirectUrl: clerkRedirectUrl() });
      if (!r.createdSessionId) {
        if (r.authSessionResult?.type === 'cancel' || r.authSessionResult?.type === 'dismiss') return false;
        throw new SignInError("We couldn't sign you in with Google. Try again.", 'failed');
      }
      await r.setActive?.({ session: r.createdSessionId });
      adopt();
      return true;
    },
    /** Clerk's hosted sign-in: email code, password, passkeys and sign-up, in the browser. */
    async hosted(mode: 'sign-in' | 'sign-up' = 'sign-in') {
      const r = await startHostedAuth({ mode, redirectUrl: clerkRedirectUrl() });
      if (!r.createdSessionId) {
        if (r.authSessionResult?.type === 'cancel' || r.authSessionResult?.type === 'dismiss') return false;
        throw new SignInError("We couldn't sign you in. Try again.", 'failed');
      }
      adopt();
      return true;
    },
  };
}
