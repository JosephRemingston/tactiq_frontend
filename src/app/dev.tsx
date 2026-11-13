import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { api } from '@/api/endpoints';
import { useEntitlements } from '@/api/hooks';
import type { PurchaseState } from '@/api/types';
import { config } from '@/config';
import { FORCED_STATES, PURCHASE_OUTCOMES, useDev } from '@/dev/devStore';
import { resetAdSession } from '@/services/ads';
import { authActions, useAuth } from '@/services/auth';
import { simulateSubscriptionState } from '@/services/billing';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Row, SectionHeader, Stack } from '@/ui/bits';
import { Lift } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Screen } from '@/ui/Screen';
import { Segmented } from '@/ui/Segmented';
import { T } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { TopBar } from '@/ui/TopBar';

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Lift
      kind="none"
      onPress={onPress}
      accessibilityState={{ selected: on }}
      style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: on ? c.lime : c.surfaceHigh }}>
      <T v="labelSm" tint={on ? c.onLime : c.ink}>
        {label}
      </T>
    </Lift>
  );
}

/** Dev menu (development builds only). Every switch here drives the real local backend. */
function DevMenu() {
  const qc = useQueryClient();
  const { snack } = useOverlay();
  const auth = useAuth();
  const ent = useEntitlements();
  const dev = useDev();
  const theme = useSettings((s) => s.themeMode);
  const setTheme = useSettings((s) => s.setThemeMode);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      await qc.invalidateQueries();
      snack(`${label}: done`);
    } catch (e) {
      snack(`${label} failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const signInAs = (key: 'free' | 'pro' | 'new') =>
    run(`Sign in as ${key}`, async () => {
      await authActions.signOut();
      const email = key === 'new' ? `new${Date.now().toString(36)}@tactiq.dev` : `${key}fan@tactiq.dev`;
      await authActions.signIn('email', email);
      const me = await api.me();
      if (!me.user.displayName) await api.updateMe({ displayName: key === 'pro' ? 'Pro fan' : key === 'free' ? 'Free fan' : 'New fan' });
      if (key === 'pro' && me.user.plan.key === 'free') {
        const { subscription } = await api.subscription();
        await api.verifyPurchase('pro_annual', `fake:pro_annual:active:365:${subscription.obfuscatedAccountId}`);
      }
      if (key !== 'new') authActions.markOnboarded();
      router.replace('/');
    });

  const states: PurchaseState[] = ['grace', 'on_hold', 'cancelled', 'revoked', 'expired', 'pending', 'active'];

  return (
    <Screen header={<TopBar title="Dev menu" sub={`API ${config.apiUrl}`} />}>
      <Stack gap={22}>
        <Card>
          <Stack gap={6}>
            <T v="eyebrow" color="muted">
              Session
            </T>
            <T v="titleSm">{auth.status === 'signedIn' ? `Signed in as user_dev_${auth.userKey}` : 'Signed out'}</T>
            <T v="bodySm" color="muted">
              Plan: {ent.data?.plan.key ?? '—'} ({ent.data?.plan.source ?? '—'})
            </T>
          </Stack>
        </Card>

        <SectionHeader title="Who am I" sub="Real backend users with dev tokens" />
        <Row wrap gap={8}>
          <Chip label="Free fan" on={auth.userKey === 'freefan'} onPress={() => signInAs('free')} />
          <Chip label="Pro fan" on={auth.userKey === 'profan'} onPress={() => signInAs('pro')} />
          <Chip label="New fan (onboarding)" on={false} onPress={() => signInAs('new')} />
          <Chip label="Signed out" on={auth.status === 'signedOut'} onPress={() => run('Sign out', async () => { await authActions.signOut(); router.replace('/'); })} />
        </Row>

        <SectionHeader title="Force a screen state" sub="Applies to every data block until cleared" />
        <Row wrap gap={8}>
          <Chip label="None" on={!dev.forced} onPress={() => dev.setForced(null)} />
          {FORCED_STATES.map((s) => (
            <Chip key={s.value} label={s.label} on={dev.forced === s.value} onPress={() => dev.setForced(s.value)} />
          ))}
        </Row>

        <SectionHeader title="Simulated purchase result" sub="What Google Play returns on Start Pro" />
        <Row wrap gap={8}>
          {PURCHASE_OUTCOMES.map((o) => (
            <Chip key={o.value} label={o.label} on={dev.purchaseOutcome === o.value} onPress={() => dev.setPurchaseOutcome(o.value)} />
          ))}
        </Row>
        <Toggle value={dev.slowPurchase} onChange={dev.setSlowPurchase} right="Slow purchase (see processing)" label="Slow purchase" />

        <SectionHeader title="Subscription state" sub="Sends a fake token to /v1/billing/google-play/verify" />
        <Row wrap gap={8}>
          {states.map((s) => (
            <Chip key={s} label={s} on={false} onPress={() => run(`State ${s}`, () => simulateSubscriptionState(s))} />
          ))}
        </Row>

        <SectionHeader title="Theme" />
        <Segmented
          label="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />

        <SectionHeader title="Other" />
        <View style={{ gap: 10 }}>
          <Button label="Design system gallery" variant="secondary" onPress={() => router.push('/gallery')} />
          <Button label="Reset ad session counters" variant="secondary" onPress={() => { resetAdSession(); snack('Ad session reset'); }} />
          <Button label="Clear cached data" variant="secondary" onPress={() => { qc.clear(); snack('Cache cleared'); }} />
          {busy ? (
            <T v="caption" color="muted" align="center">
              {busy}…
            </T>
          ) : null}
        </View>
      </Stack>
    </Screen>
  );
}

/** Development builds only. In a release build this route does not exist: it redirects home. */
export default function DevMenuRoute() {
  return __DEV__ ? <DevMenu /> : <Redirect href="/" />;
}
