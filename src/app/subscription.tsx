import { useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { queryKey, useSubscription, useUserScope } from '@/api/hooks';
import type { Purchase } from '@/api/types';
import { QueryBoundary } from '@/components/QueryBoundary';
import { SignedOutCard } from '@/components/states';
import { fmtDate, fmtDayMonth } from '@/lib/format';
import { useSignedIn } from '@/services/auth';
import { restorePurchases } from '@/services/billing';
import { openPaywall } from '@/services/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { Banner, type BannerTone } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Row, Stack } from '@/ui/bits';
import { Rise } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

/** Status banner per purchase state (messaging); access always follows `entitled`. */
export function statusBanner(p: Purchase): { tone: BannerTone; title: string; body: string } | null {
  const until = p.expiresAt ? fmtDayMonth(p.expiresAt) : null;
  switch (p.state) {
    case 'grace':
      return { tone: 'warning', title: 'Payment problem', body: 'Update your payment method in Google Play. You still have Pro while Google retries.' };
    case 'on_hold':
      return { tone: 'error', title: 'Pro is paused', body: 'Pro is paused until the payment is fixed in Google Play.' };
    case 'paused':
      return { tone: 'info', title: 'Subscription paused', body: `You paused Pro in Google Play${until ? `; it resumes after ${until}` : ''}.` };
    case 'cancelled':
      return { tone: 'info', title: `Pro until ${until ?? 'the end of this period'}`, body: "You cancelled, so it won't renew. Everything stays until then." };
    case 'revoked':
      return { tone: 'info', title: 'This purchase was refunded', body: 'Refunded purchases no longer give Pro. You can subscribe again any time.' };
    case 'expired':
      return { tone: 'info', title: 'Pro has ended', body: 'Your subscription expired. Subscribe again to get Pro back.' };
    case 'pending':
      return { tone: 'warning', title: 'Payment pending', body: 'Pro starts when Google confirms your payment.' };
    default:
      return null;
  }
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ minHeight: 44 }}>
      <T v="bodySm" color="muted" style={{ flex: 1 }}>
        {label}
      </T>
      <T v="label">{value}</T>
    </Row>
  );
}

/** Screen 38, Subscription management. No ads. */
export default function SubscriptionPage() {
  const { c } = useTheme();
  const signedIn = useSignedIn();
  const q = useSubscription();
  const qc = useQueryClient();
  const scope = useUserScope();
  const { snack } = useOverlay();
  const [restoring, setRestoring] = useState(false);
  if (!signedIn)
    return (
      <Screen header={<TopBar title="Subscription" />}>
        <SignedOutCard />
      </Screen>
    );
  return (
    <Screen header={<TopBar title="Subscription" />}>
      <QueryBoundary query={q}>
        {({ subscription: s }) => {
          const p = s.purchase;
          const isPro = s.plan.key !== 'free';
          const banner = p ? statusBanner(p) : null;
          const planName = s.plan.key === 'pro_annual' ? 'Pro, annual' : s.plan.key === 'pro_monthly' ? 'Pro, monthly' : 'Free';
          return (
            <Stack gap={18}>
              {banner ? (
                <Rise>
                  <Banner tone={banner.tone} title={banner.title}>
                    {banner.body}
                  </Banner>
                </Rise>
              ) : null}
              <Rise index={1}>
                <Card variant={isPro ? 'hero' : 'light'} glow={0.5}>
                  <Tag tone={isPro ? 'lime' : 'neutral'} icon={isPro ? 'bolt' : undefined}>
                    {planName}
                  </Tag>
                  <T v="headline" tint={isPro ? c.heroInk : undefined} style={{ marginTop: 14 }}>
                    {isPro ? 'You have Pro' : 'You are on Free'}
                  </T>
                  {p ? (
                    <View style={{ marginTop: 10 }}>
                      <Divider style={{ backgroundColor: isPro ? 'rgba(255,255,255,0.1)' : c.line }} />
                      {[
                        ['Status', p.state.replace('_', ' ')],
                        [p.autoRenewing ? 'Renews on' : 'Ends on', fmtDate(p.expiresAt)],
                        ['Auto-renew', p.autoRenewing ? 'On' : 'Off'],
                        ['Billed through', s.billingProvider === 'google_play' ? 'Google Play' : (s.billingProvider ?? '—')],
                      ].map(([k, v]) => (
                        <View key={k}>
                          <Row style={{ minHeight: 44 }}>
                            <T v="bodySm" tint={isPro ? c.heroMuted : c.muted} style={{ flex: 1 }}>
                              {k}
                            </T>
                            <T v="label" tint={isPro ? c.heroInk : c.ink} style={{ textTransform: 'capitalize' }}>
                              {v}
                            </T>
                          </Row>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <T v="body" color="muted" style={{ marginTop: 8 }}>
                      No subscription on this account.
                    </T>
                  )}
                </Card>
              </Rise>
              {s.manageUrl ? <Button label="Manage in Google Play" icon="open_in_new" variant="ink" chevron={false} onPress={() => WebBrowser.openBrowserAsync(s.manageUrl!)} /> : null}
              {!isPro && s.billingAvailable ? <Button label="See Pro" onPress={() => openPaywall({ context: 'upgrade' })} /> : null}
              {!s.billingAvailable ? (
                <Banner tone="info" title="Pro is coming soon">
                  Purchases aren't available yet.
                </Banner>
              ) : null}
              <Button
                label="Restore purchases"
                variant="secondary"
                loading={restoring}
                onPress={async () => {
                  setRestoring(true);
                  try {
                    const r = await restorePurchases();
                    await qc.invalidateQueries({ queryKey: queryKey(scope) });
                    snack(r.purchases.length ? 'Purchases restored' : 'No purchases found for this account');
                  } catch {
                    snack("Couldn't restore purchases.");
                  } finally {
                    setRestoring(false);
                  }
                }}
              />
              <T v="caption" color="muted">
                To cancel, open Google Play. Deleting your Tactiq account doesn't cancel a subscription.
              </T>
              <Line label="Account id for Google Play" value={`…${s.obfuscatedAccountId.slice(-8)}`} />
            </Stack>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
