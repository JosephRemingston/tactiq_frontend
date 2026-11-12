import { router } from 'expo-router';
import { useState } from 'react';

import { authActions, SignInError, usingClerk, type SignInMethod } from '@/services/auth';
import { useClerkSignIn } from '@/services/clerk';
import { Button } from '@/ui/Button';
import { useOverlay } from '@/ui/overlay';

function done() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/');
}

function message(e: unknown) {
  if (e instanceof SignInError) return e.kind === 'network' ? "We couldn't reach the sign-in service. Check your connection." : e.message;
  return "We couldn't sign you in. Try again.";
}

type Props = { onError?: (msg: string) => void; variant?: 'primary' | 'ink' | 'secondary' };

function ClerkGoogle({ onError }: Props) {
  const c = useClerkSignIn();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      label="Continue with Google"
      icon="account_circle"
      loading={busy}
      onPress={async () => {
        setBusy(true);
        try {
          if (await c.google()) done();
        } catch (e) {
          onError?.(message(e));
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

function ClerkHosted({ onError, label, mode, variant = 'ink' }: Props & { label: string; mode: 'sign-in' | 'sign-up' }) {
  const c = useClerkSignIn();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      label={label}
      icon="mail"
      variant={variant}
      chevron={false}
      loading={busy}
      onPress={async () => {
        setBusy(true);
        try {
          if (await c.hosted(mode)) done();
        } catch (e) {
          onError?.(message(e));
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

/** "Continue with Google": Clerk OAuth when configured, the simulated dev sign-in otherwise. */
export function GoogleSignInButton({ onError }: Props) {
  const { snack } = useOverlay();
  const report = onError ?? snack;
  const [busy, setBusy] = useState(false);
  if (usingClerk) return <ClerkGoogle onError={report} />;
  return (
    <Button
      label="Continue with Google"
      icon="account_circle"
      loading={busy}
      onPress={async () => {
        setBusy(true);
        try {
          await authActions.signIn('google');
          done();
        } catch (e) {
          report(message(e));
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

/** Email, password, passkey and sign-up through Clerk's hosted sign-in (Clerk mode only). */
export function HostedSignInButtons({ onError }: Props) {
  return (
    <>
      <ClerkHosted onError={onError} label="Sign in with email or passkey" mode="sign-in" />
      <ClerkHosted onError={onError} label="Create an account" mode="sign-up" variant="secondary" />
    </>
  );
}

/** Simulated email / passkey sign-in (dev stack). */
export async function simulatedSignIn(method: SignInMethod, email?: string) {
  await authActions.signIn(method, email);
  done();
}

export { message as signInErrorMessage };
