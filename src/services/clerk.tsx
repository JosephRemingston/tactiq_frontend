import { ClerkProvider, getClerkInstance, isClerkAPIResponseError, useAuth as useClerkAuth, useSSO } from '@clerk/expo';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import { tokenCache } from '@clerk/expo/token-cache';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, type ReactNode } from 'react';

import { config } from '@/config';
import { log } from '@/security/log';
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

/** Turns whatever Clerk threw into a sentence a person can act on, and logs the detail to the Metro terminal. */
function explain(e: unknown, redirectUrl: string): SignInError {
  if (e instanceof SignInError) return e;
  log.warn('sign-in failed', { redirectUrl, error: e });
  if (isClerkAPIResponseError(e)) {
    const first = e.errors?.[0];
    const text = first?.longMessage ?? first?.message ?? 'Clerk rejected the request.';
    const hint = /redirect/i.test(`${first?.code} ${text}`) ? ` Allow this redirect URL in the Clerk Dashboard: ${redirectUrl}` : '';
    return new SignInError(`${text}${first?.code ? ` (${first.code})` : ''}${hint}`, 'failed');
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (/network|fetch|timed? ?out/i.test(msg)) return new SignInError("We couldn't reach the sign-in service. Check your connection.", 'network');
  return new SignInError(msg || "We couldn't sign you in. Try again.", 'failed');
}

/** Sign-in actions backed by Clerk. Only call inside AuthRoot when `usingClerk`. */
export function useClerkSignIn() {
  const { startSSOFlow } = useSSO();
  const { startHostedAuth } = useHostedAuth();
  const { isLoaded } = useClerkAuth();

  const adopt = () => {
    const id = getClerkInstance({ publishableKey: config.clerkPublishableKey }).user?.id;
    if (!id) throw new SignInError("Signed in, but the session didn't start. Try again.", 'failed');
    authActions.adoptSession(id);
  };
  const notReady = () => new SignInError('Sign-in is still starting up. Wait a few seconds and try again; if it keeps happening, the app cannot reach Clerk.', 'network');
  const cancelled = (t: string | undefined) => t === 'cancel' || t === 'dismiss';
  const noReturn = (redirectUrl: string) =>
    new SignInError(`The browser didn't hand the sign-in back to the app. Allow this redirect URL in the Clerk Dashboard (Native applications): ${redirectUrl}`, 'failed');

  return {
    /** Google through Clerk's browser OAuth flow (works in Expo Go). */
    async google() {
      const redirectUrl = clerkRedirectUrl();
      if (!isLoaded) throw notReady();
      try {
        const r = await startSSOFlow({ strategy: 'oauth_google', redirectUrl });
        if (!r.createdSessionId) {
          if (cancelled(r.authSessionResult?.type)) return false;
          if (!r.authSessionResult) throw notReady();
          // The browser came back but no session exists: say what Clerk is still waiting for.
          const missing = r.signUp?.missingFields ?? [];
          if (r.signUp?.status === 'missing_requirements' && missing.length)
            throw new SignInError(`Your Clerk sign-up settings require ${missing.join(', ')}, which Google doesn't provide. Make ${missing.length > 1 ? 'them' : 'it'} optional in the Clerk Dashboard, or use "Create an account".`, 'failed');
          if (r.authSessionResult.type !== 'success') throw noReturn(redirectUrl);
          throw new SignInError(`Google sign-in didn't finish (sign-in: ${r.signIn?.status ?? 'unknown'}, sign-up: ${r.signUp?.status ?? 'unknown'}). Redirect URL in use: ${redirectUrl}`, 'failed');
        }
        await r.setActive?.({ session: r.createdSessionId });
        adopt();
        return true;
      } catch (e) {
        throw explain(e, redirectUrl);
      }
    },
    /** Clerk's hosted sign-in: email code, password, passkeys and sign-up, in the browser. */
    async hosted(mode: 'sign-in' | 'sign-up' = 'sign-in') {
      const redirectUrl = clerkRedirectUrl();
      if (!isLoaded) throw notReady();
      try {
        const r = await startHostedAuth({ mode, redirectUrl });
        if (!r.createdSessionId) {
          if (cancelled(r.authSessionResult?.type)) return false;
          throw noReturn(redirectUrl);
        }
        adopt();
        return true;
      } catch (e) {
        throw explain(e, redirectUrl);
      }
    },
  };
}
