import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { lastError } from '@/api/errors';
import { useEntitlements, useMe, useSavedIds, useUpdateMe } from '@/api/hooks';
import type { Entitlement, Interest } from '@/api/types';
import { AvatarCircle } from '@/components/Avatar';
import { DepthSwitch } from '@/components/DepthSwitch';
import { QueryBoundary } from '@/components/QueryBoundary';
import { ListRow, IconTile } from '@/components/rows';
import { SignedOutCard } from '@/components/states';
import { config } from '@/config';
import { safeOpenUrl } from '@/security/links';
import { fmtDayMonth } from '@/lib/format';
import { authActions, useSignedIn } from '@/services/auth';
import { openPaywall } from '@/services/paywall';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Row, SectionHeader, Stack } from '@/ui/bits';
import { Chip, ChipWrap } from '@/ui/Chip';
import { Rise } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { Segmented } from '@/ui/Segmented';
import { T } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { TopBar } from '@/ui/TopBar';

const USAGE: { key: string; label: string }[] = [
  { key: 'analysis.matches_per_month', label: 'Analysed matches' },
  { key: 'comparisons.per_month', label: 'Comparisons' },
  { key: 'analysis.rerun_per_month', label: 'Re-analyses' },
  { key: 'following.max_saved_items', label: 'Saved items' },
];

const INTERESTS: { value: Interest; label: string }[] = [
  { value: 'match_explanations', label: 'Match explanations' },
  { value: 'tactics', label: 'Tactics' },
  { value: 'players', label: 'Players' },
  { value: 'learning', label: 'Learning' },
  { value: 'detailed_stats', label: 'Detailed stats' },
];

function UsageBar({ e, label, savedCount }: { e: Entitlement | undefined; label: string; savedCount?: number }) {
  const { c } = useTheme();
  if (!e) return null;
  const unlimited = e.limitValue === null;
  const used = e.usagePeriod === 'none' ? (savedCount ?? 0) : (e.used ?? 0);
  const limit = e.limitValue ?? 0;
  const pct = unlimited || !limit ? 0 : Math.min(1, used / limit);
  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={`${label}: ${unlimited ? 'unlimited' : `${used} of ${limit}`}`}>
      <Row>
        <T v="bodySm" style={{ flex: 1 }}>
          {label}
        </T>
        <T v="number" style={{ fontSize: 14 }}>
          {unlimited ? 'Unlimited' : `${used} of ${limit}`}
        </T>
      </Row>
      {!unlimited ? (
        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceHigh, overflow: 'hidden' }}>
          <View style={{ width: `${pct * 100}%`, height: 6, borderRadius: 3, backgroundColor: pct >= 1 ? c.error : pct > 0.8 ? c.warning : c.ink }} />
        </View>
      ) : null}
    </View>
  );
}

function NameEditor({ initial, onDone }: { initial: string; onDone: () => void }) {
  const u = useUpdateMe();
  const [name, setName] = useState(initial);
  const err = name.trim().length < 1 ? 'Enter a name' : name.trim().length > 80 ? 'Up to 80 characters' : null;
  return (
    <Stack gap={14}>
      <TextField label="Display name" value={name} onChangeText={setName} maxLength={80} counter autoFocus error={name.length ? err : null} />
      <Button label="Save" variant="ink" disabled={!!err} loading={u.isPending} onPress={() => u.mutate({ displayName: name.trim() }, { onSuccess: onDone })} />
    </Stack>
  );
}

/** Screen 35, Profile and settings. No ads. */
export default function Profile() {
  const signedIn = useSignedIn();
  const me = useMe();
  const ent = useEntitlements();
  const saved = useSavedIds();
  const savedCount = (saved.data?.matches.size ?? 0) + (saved.data?.insights.size ?? 0);
  const upd = useUpdateMe();
  const theme = useSettings((s) => s.themeMode);
  const setTheme = useSettings((s) => s.setThemeMode);
  const setLocalDepth = useSettings((s) => s.setDepth);
  const { openSheet, closeSheet, confirm, snack } = useOverlay();

  if (!signedIn)
    return (
      <Screen header={<TopBar title="Profile" />}>
        <SignedOutCard body="Sign in to manage your profile and plan." />
      </Screen>
    );

  return (
    <Screen header={<TopBar title="Profile and settings" />}>
      <QueryBoundary query={me}>
        {({ user }) => {
          const isPro = user.plan.key !== 'free';
          const byKey = new Map((ent.data?.entitlements ?? []).map((e) => [e.featureKey, e]));
          const resets = byKey.get('analysis.matches_per_month')?.resetsAt;
          return (
            <Stack gap={24}>
              <Rise>
                <Card variant={isPro ? 'hero' : 'light'} glow={0.5}>
                  <Row gap={14}>
                    <AvatarCircle name={user.displayName ?? user.email} url={user.avatarUrl} size={56} />
                    <View style={{ flex: 1 }}>
                      <T v="title" tint={isPro ? '#f2f5f6' : undefined}>
                        {user.displayName ?? 'Add your name'}
                      </T>
                      <T v="bodySm" tint={isPro ? '#a9b0b3' : undefined} color="muted">
                        {user.email ?? 'No email on this account'}
                      </T>
                    </View>
                    <Tag tone={isPro ? 'lime' : 'neutral'} icon={isPro ? 'bolt' : undefined}>
                      {isPro ? 'Pro' : 'Free'}
                    </Tag>
                  </Row>
                  <View style={{ marginTop: 18 }}>
                    {isPro ? (
                      <Button label="Manage subscription" variant="onHero" chevron={false} onPress={() => router.push('/subscription')} />
                    ) : (
                      <Button label="Upgrade to Pro" onPress={() => openPaywall({ context: 'upgrade' })} />
                    )}
                  </View>
                </Card>
              </Rise>

              <Rise index={1}>
                <SectionHeader title="This month" sub={resets ? `Limits reset on ${fmtDayMonth(resets)}` : undefined} />
                <Card style={{ marginTop: 12 }}>
                  <Stack gap={16}>
                    {USAGE.map((u) => (
                      <UsageBar key={u.key} e={byKey.get(u.key)} label={u.label} savedCount={savedCount} />
                    ))}
                  </Stack>
                </Card>
              </Rise>

              <Rise index={2}>
                <SectionHeader title="Preferences" />
                <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 12 }}>
                  <ListRow
                    leading={<IconTile icon="badge" />}
                    title="Display name"
                    sub={user.displayName ?? 'Not set'}
                    onPress={() => openSheet(<NameEditor initial={user.displayName ?? ''} onDone={closeSheet} />, { title: 'Display name' })}
                  />
                  <Divider inset={54} />
                  <View style={{ paddingVertical: 14, gap: 10 }}>
                    <T v="titleSm">Default explanation depth</T>
                    <DepthSwitch
                      value={user.depthPreference}
                      onChange={(d) => {
                        setLocalDepth(d);
                        upd.mutate({ depthPreference: d });
                      }}
                      size="sm"
                    />
                  </View>
                  <Divider />
                  <View style={{ paddingVertical: 14, gap: 10 }}>
                    <T v="titleSm">Interests</T>
                    <ChipWrap>
                      {INTERESTS.map((i) => {
                        const on = user.interests.includes(i.value);
                        return (
                          <Chip
                            key={i.value}
                            label={i.label}
                            selected={on}
                            onPress={() => upd.mutate({ interests: on ? user.interests.filter((x) => x !== i.value) : [...user.interests, i.value].slice(0, 5) })}
                          />
                        );
                      })}
                    </ChipWrap>
                  </View>
                  <Divider />
                  <View style={{ paddingVertical: 14, gap: 10 }}>
                    <T v="titleSm">Language and region</T>
                    <Segmented
                      label="Language and region"
                      size="sm"
                      value={user.locale === 'en-GB' ? 'en-GB' : 'en'}
                      onChange={(l) => upd.mutate({ locale: l })}
                      options={[
                        { value: 'en', label: 'English' },
                        { value: 'en-GB', label: 'English (UK)' },
                      ]}
                    />
                  </View>
                  <Divider />
                  <View style={{ paddingVertical: 14, gap: 10 }}>
                    <T v="titleSm">Theme</T>
                    <Segmented
                      label="Theme"
                      size="sm"
                      value={theme}
                      onChange={setTheme}
                      options={[
                        { value: 'system', label: 'System' },
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                      ]}
                    />
                  </View>
                </Card>
              </Rise>

              <Rise index={3}>
                <SectionHeader title="Privacy and ads" />
                <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 12 }}>
                  <ListRow
                    leading={<IconTile icon="ads_click" />}
                    title="Ad choices"
                    sub={isPro ? 'Pro has no ads' : 'Manage consent for personalised ads'}
                    onPress={() =>
                      openSheet(
                        <Stack gap={12}>
                          <T v="body">Google's consent form opens here so you can choose how ads use your data.</T>
                          <T v="bodySm" color="muted">
                            In this build the consent form is simulated. Tactiq never passes your data to ad networks.
                          </T>
                          <Button label="Close" variant="secondary" onPress={closeSheet} />
                        </Stack>,
                        { title: 'Ad choices' },
                      )
                    }
                  />
                  <Divider inset={54} />
                  <ListRow leading={<IconTile icon="policy" />} title="Privacy policy" onPress={() => safeOpenUrl(config.privacyUrl)} />
                  <Divider inset={54} />
                  <ListRow leading={<IconTile icon="gavel" />} title="Terms" onPress={() => safeOpenUrl(config.termsUrl)} />
                </Card>
              </Rise>

              <Rise index={4}>
                <SectionHeader title="Account" />
                <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 12 }}>
                  <ListRow leading={<IconTile icon="devices" />} title="Devices" sub="Where you're signed in" onPress={() => router.push('/devices')} />
                  <Divider inset={54} />
                  {isPro ? (
                    <>
                      <ListRow leading={<IconTile icon="credit_card" />} title="Subscription" onPress={() => router.push('/subscription')} />
                      <Divider inset={54} />
                    </>
                  ) : null}
                  <ListRow
                    leading={<IconTile icon="bug_report" />}
                    title="Report a problem"
                    sub={lastError.current ? `Last error reference: ${lastError.current.requestId}` : 'No recent errors'}
                    onPress={() =>
                      openSheet(
                        <Stack gap={12}>
                          {lastError.current ? (
                            <>
                              <T v="body">Include this reference when you contact us, so we can find what went wrong.</T>
                              <Card variant="tint">
                                <T v="label" selectable>
                                  {lastError.current.requestId}
                                </T>
                                <T v="caption" color="muted" style={{ marginTop: 4 }}>
                                  {lastError.current.message} · {new Date(lastError.current.at).toLocaleString('en-GB')}
                                </T>
                              </Card>
                              <Button
                                label="Copy reference"
                                icon="content_copy"
                                variant="ink"
                                chevron={false}
                                onPress={() => {
                                  Clipboard.setStringAsync(lastError.current!.requestId).catch(() => {});
                                  snack('Reference copied');
                                }}
                              />
                            </>
                          ) : (
                            <T v="body">Nothing has gone wrong recently. If something looks off, tell us what you were doing.</T>
                          )}
                        </Stack>,
                        { title: 'Report a problem' },
                      )
                    }
                  />
                </Card>
              </Rise>

              <Stack gap={10}>
                <Button
                  label="Sign out of this device"
                  variant="secondary"
                  onPress={() =>
                    confirm({
                      title: 'Sign out?',
                      body: 'Your saved items stay in your account.',
                      confirm: 'Sign out',
                      onConfirm: async () => {
                        await authActions.signOut();
                        router.replace('/welcome');
                      },
                    })
                  }
                />
                <Button label="Delete account" variant="text" onPress={() => router.push('/delete-account')} />
              </Stack>
            </Stack>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
