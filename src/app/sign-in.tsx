import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';

import { config } from '@/config';
import { authActions, SignInError, type SignInMethod } from '@/services/auth';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Divider, Row, Stack } from '@/ui/bits';
import { Wordmark } from '@/ui/Logo';
import { Rise } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { TopBar } from '@/ui/TopBar';

/** Screen 3, Sign in: Google, passkey, email (Clerk in production; simulated here). No ads. */
export default function SignIn() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<SignInMethod | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (method: SignInMethod) => {
    setError(null);
    setBusy(method);
    try {
      await authActions.signIn(method, email);
      if (router.canDismiss()) router.dismissAll();
      router.replace('/');
    } catch (e) {
      setError(
        e instanceof SignInError
          ? e.kind === 'network'
            ? "We couldn't reach the sign-in service. Check your connection and try again."
            : e.message
          : "We couldn't sign you in. Try again.",
      );
    } finally {
      setBusy(null);
    }
  };

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
            {error ? <Banner tone="error" title="Sign-in failed">{error}</Banner> : null}
            <Button label="Continue with Google" icon="account_circle" onPress={() => go('google')} loading={busy === 'google'} />
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
                setError(null);
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
          </Stack>
        </Rise>
        <View style={{ marginTop: 28 }}>
          <T v="caption" color="muted" align="center">
            By continuing you agree to the{' '}
            <T v="caption" style={{ textDecorationLine: 'underline' }} onPress={() => WebBrowser.openBrowserAsync(config.termsUrl)} accessibilityRole="link">
              Terms
            </T>{' '}
            and{' '}
            <T v="caption" style={{ textDecorationLine: 'underline' }} onPress={() => WebBrowser.openBrowserAsync(config.privacyUrl)} accessibilityRole="link">
              Privacy policy
            </T>
            .
          </T>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
