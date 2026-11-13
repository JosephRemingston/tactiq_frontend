import { useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';

import { GoogleSignInButton, HostedSignInButtons, signInErrorMessage, simulatedSignIn } from '@/components/SignInButtons';
import { config } from '@/config';
import { safeOpenUrl } from '@/security/links';
import { usingClerk, type SignInMethod } from '@/services/auth';
import { clerkRedirectUrl } from '@/services/clerk';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Divider, Row, Stack } from '@/ui/bits';
import { Wordmark } from '@/ui/Logo';
import { Rise } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { TopBar } from '@/ui/TopBar';

/** Dev stack only: passkey and email through the simulated provider. */
function SimulatedOptions({ onError }: { onError: (m: string | null) => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<SignInMethod | null>(null);
  const go = async (method: SignInMethod) => {
    onError(null);
    setBusy(method);
    try {
      await simulatedSignIn(method, email);
    } catch (e) {
      onError(signInErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <Button label="Use a passkey" icon="passkey" variant="ink" chevron={false} onPress={() => go('passkey')} loading={busy === 'passkey'} />
      <Row gap={12} style={{ marginVertical: 8 }}>
        <Divider style={{ flex: 1 }} />
        <T v="caption" color="muted">
          or with email
        </T>
        <Divider style={{ flex: 1 }} />
      </Row>
      <TextField
        label="Email"
        icon="mail"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          onError(null);
        }}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="go"
        onSubmitEditing={() => go('email')}
        maxLength={254}
      />
      <Button label="Continue with email" variant="secondary" onPress={() => go('email')} loading={busy === 'email'} disabled={email.trim().length < 3} />
    </>
  );
}

/** Screen 3, Sign in: Google, passkey, email (Clerk in production; simulated on the dev stack). No ads. */
export default function SignIn() {
  const [error, setError] = useState<string | null>(null);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen header={<TopBar />}>
        <Rise>
          <Wordmark size={22} />
          <T v="display" style={{ marginTop: 26 }}>
            Sign in
          </T>
          <T v="body" color="muted" style={{ marginTop: 8 }}>
            Save matches, write notes and get a home feed for the teams you follow.
          </T>
        </Rise>
        <Rise index={1} style={{ marginTop: 28 }}>
          <Stack gap={12}>
            {error ? (
              <Banner tone="error" title="Sign-in failed">
                {error}
              </Banner>
            ) : null}
            <GoogleSignInButton onError={setError} />
            {usingClerk ? (
              <>
                <HostedSignInButtons onError={setError} />
                <T v="caption" color="muted" align="center">
                  Email, password and passkeys open Tactiq's secure sign-in page.
                </T>
                {__DEV__ ? (
                  <T v="caption" color="faint" align="center" selectable>
                    Dev: redirect URL to allow in Clerk{'\n'}
                    {clerkRedirectUrl()}
                  </T>
                ) : null}
              </>
            ) : (
              <SimulatedOptions onError={setError} />
            )}
          </Stack>
        </Rise>
        <View style={{ marginTop: 28 }}>
          <T v="caption" color="muted" align="center">
            By continuing you agree to the{' '}
            <T v="caption" style={{ textDecorationLine: 'underline' }} onPress={() => safeOpenUrl(config.termsUrl)} accessibilityRole="link">
              Terms
            </T>{' '}
            and{' '}
            <T v="caption" style={{ textDecorationLine: 'underline' }} onPress={() => safeOpenUrl(config.privacyUrl)} accessibilityRole="link">
              Privacy policy
            </T>
            .
          </T>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
