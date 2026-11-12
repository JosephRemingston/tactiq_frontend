import { router } from 'expo-router';
import { useState } from 'react';

import { api } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import { useSubscription } from '@/api/hooks';
import { SignedOutCard } from '@/components/states';
import { authActions, useSignedIn } from '@/services/auth';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { CheckItem, Stack } from '@/ui/bits';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { TopBar } from '@/ui/TopBar';

const PHRASE = 'DELETE';

/** Screen 36b, Delete account: what is deleted, the Play subscription note, type to confirm. */
export default function DeleteAccount() {
  const signedIn = useSignedIn();
  const sub = useSubscription();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; ref?: string | null } | null>(null);
  if (!signedIn)
    return (
      <Screen header={<TopBar title="Delete account" />}>
        <SignedOutCard />
      </Screen>
    );
  const activeSub = sub.data?.subscription.purchase && ['active', 'grace', 'pending', 'on_hold', 'paused'].includes(sub.data.subscription.purchase.state);
  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.deleteMe();
      await authActions.signOut();
      router.replace('/goodbye');
    } catch (e) {
      setError({ message: e instanceof ApiError ? e.message : "Couldn't delete the account.", ref: e instanceof ApiError ? e.requestId : null });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen header={<TopBar title="Delete account" />}>
      <Stack gap={20}>
        <T v="display">Delete your account</T>
        <T v="body" color="inkSecondary">
          This permanently deletes your Tactiq account. It can't be undone.
        </T>
        <Card>
          <T v="titleSm">What gets deleted</T>
          <Stack gap={12} style={{ marginTop: 14 }}>
            <CheckItem>Your profile and preferences</CheckItem>
            <CheckItem>Everything you follow</CheckItem>
            <CheckItem>Saved matches and insights</CheckItem>
            <CheckItem>Notes and collections</CheckItem>
            <CheckItem>Learning progress</CheckItem>
          </Stack>
        </Card>
        <Banner tone={activeSub ? 'warning' : 'info'} title="Subscriptions are separate">
          {activeSub
            ? 'You have an active Google Play subscription. Deleting your account does not cancel it: cancel it in Google Play first, or you will keep being charged.'
            : 'If you have a Google Play subscription, cancel it in Google Play. Deleting your account does not cancel it.'}
        </Banner>
        {activeSub && sub.data?.subscription.manageUrl ? (
          <Button label="Open Google Play subscriptions" variant="secondary" onPress={() => import('expo-web-browser').then((w) => w.openBrowserAsync(sub.data!.subscription.manageUrl!))} />
        ) : null}
        <TextField label={`Type ${PHRASE} to confirm`} value={text} onChangeText={setText} autoCapitalize="characters" autoCorrect={false} maxLength={20} placeholder={PHRASE} />
        {error ? (
          <Banner tone="error" title="Something went wrong">
            {`${error.message}${error.ref ? ` Reference: ${error.ref}` : ''}`}
          </Banner>
        ) : null}
        <Button label="Delete my account" variant="destructive" disabled={text.trim().toUpperCase() !== PHRASE} loading={busy} onPress={go} />
        <Button label="Keep my account" variant="text" onPress={() => router.back()} />
      </Stack>
    </Screen>
  );
}
