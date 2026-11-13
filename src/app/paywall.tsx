import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { queryKey, useBillingProducts, useIsPro, useUserScope } from '@/api/hooks';
import type { BillingProducts } from '@/api/types';
import { PlanCard } from '@/components/PlanCard';
import { authActions, useSignedIn } from '@/services/auth';
import { annualSaving, purchase, restorePurchases, store, type PurchaseResult } from '@/services/billing';
import { resetAdSession } from '@/services/ads';
import { isoDate, oneOf, smallInt } from '@/security/validate';
import { contextLine, PAYWALL_CONTEXTS, type PaywallContext } from '@/services/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { motion } from '@/theme/motion';
import { Banner } from '@/ui/Banner';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { CheckDisc, Deco, Divider, Row, Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Rise } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Eyebrow, Tag } from '@/ui/Pill';
import { T } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';

type Phase = { k: 'idle' } | { k: 'processing'; stage: 'store' | 'confirming' | 'retrying' } | { k: 'done'; r: PurchaseResult };

function Comparison({ data }: { data: BillingProducts }) {
  const { c } = useTheme();
  return (
    <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <Row style={{ paddingVertical: 10 }}>
        <T v="caption" color="muted" style={{ flex: 1.6 }}>
          Feature
        </T>
        <T v="caption" color="muted" style={{ flex: 1, textAlign: 'center' }}>
          Free
        </T>
        <T v="caption" style={{ flex: 1, textAlign: 'center', fontFamily: 'Inter_700Bold' }}>
          Pro
        </T>
      </Row>
      {data.comparison.map((g) => (
        <View key={g.group}>
          <T v="eyebrow" color="muted" style={{ marginTop: 12, marginBottom: 4 }}>
            {g.group}
          </T>
          {g.items.map((it) => {
            const cell = (v: string, pro: boolean) =>
              /^yes$/i.test(v) ? (
                <View style={{ flex: 1, alignItems: 'center' }} accessibilityLabel="Included">
                  <CheckDisc size={18} color={pro ? c.ink : c.muted} tick={c.surface} />
                </View>
              ) : /^(no|none|—)$/i.test(v) ? (
                <View style={{ flex: 1, alignItems: 'center' }} accessibilityLabel="Not included">
                  <CheckDisc size={18} off color={c.muted} />
                </View>
              ) : (
                <T v={pro ? 'labelSm' : 'caption'} color={pro ? 'ink' : 'muted'} style={{ flex: 1, textAlign: 'center' }}>
                  {v}
                </T>
              );
            return (
              <View key={it.featureKey + it.label}>
                <Divider />
                <Row style={{ minHeight: 52, paddingVertical: 6 }} >
                  <T v="bodySm" style={{ flex: 1.6 }}>
                    {it.label}
                  </T>
                  {cell(it.free, false)}
                  {cell(it.pro, true)}
                </Row>
              </View>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

function ResultView({ r, onClose, onRetry }: { r: { status: PurchaseResult['status']; requestId?: string | null }; onClose: () => void; onRetry: () => void }) {
  const { c } = useTheme();
  if (r.status === 'success')
    return (
      <Rise>
        <Card variant="hero">
          <Tag tone="lime" icon="bolt">
            Pro
          </Tag>
          <T v="display" tint={c.lime} style={{ marginTop: 18 }}>
            You're on Pro
          </T>
          <T v="body" tint={c.heroInkSecondary} style={{ marginTop: 10 }}>
            Here's what just unlocked:
          </T>
          <Stack gap={12} style={{ marginTop: 14 }}>
            {['Unlimited match analysis', 'Unlimited comparisons', 'Event and possession filters', 'Every past season', 'Unlimited saved items', 'No ads'].map((t) => (
              <Row key={t} gap={11}>
                <CheckDisc color="#ffffff" tick={c.hero} />
                <T v="bodySm" tint={c.heroInkSecondary}>
                  {t}
                </T>
              </Row>
            ))}
          </Stack>
          <View style={{ height: 22 }} />
          <Button label="Back to the match" onPress={onClose} />
        </Card>
      </Rise>
    );
  const map = {
    pending: { tone: 'warning' as const, title: 'Payment pending', body: 'Your payment is pending; Pro starts when Google confirms it.', retry: false },
    cancelled: { tone: 'info' as const, title: 'Purchase cancelled', body: 'Nothing was charged. You can try again whenever you like.', retry: true },
    failed: { tone: 'info' as const, title: "That didn't go through", body: 'Nothing was charged. Try again in a moment.', retry: true },
    other_account: { tone: 'warning' as const, title: 'Linked to another account', body: 'This purchase is linked to another Tactiq account. Sign in with that account to use it.', retry: false },
    unavailable: { tone: 'info' as const, title: 'Pro is coming soon', body: "Purchases aren't available yet. We'll let you know when they are.", retry: false },
  };
  const m = map[r.status as keyof typeof map];
  return (
    <Rise>
      <Stack gap={14}>
        <Banner tone={m.tone} title={m.title}>
          {`${m.body}${r.requestId ? ` Reference: ${r.requestId}` : ''}`}
        </Banner>
        {m.retry ? <Button label="Try again" variant="ink" onPress={onRetry} /> : null}
        <Button label={r.status === 'pending' ? 'Got it' : 'Close'} variant="secondary" onPress={onClose} />
      </Stack>
    </Rise>
  );
}

/** Screen 37, Paywall: contextual, Free vs Pro, purchase states. Never blocks stories or the timeline. */
export default function Paywall() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{ context?: PaywallContext; resetsAt?: string; limit?: string }>();
  const signedIn = useSignedIn();
  const { isPro } = useIsPro();
  const qc = useQueryClient();
  const scope = useUserScope();
  const { snack, confirm } = useOverlay();
  const products = useBillingProducts();
  const storeProducts = useQuery({ queryKey: ['store-products'], queryFn: () => store.queryProducts(), staleTime: 60 * 60_000 });
  const [annual, setAnnual] = useState(true);
  const [phase, setPhase] = useState<Phase>({ k: 'idle' });
  const [restoring, setRestoring] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  // Route parameters are untrusted: only known contexts, plain numbers and real dates reach the copy.
  const context = oneOf(p.context, PAYWALL_CONTEXTS, 'upgrade');
  const line = contextLine(context, { resetsAt: isoDate(p.resetsAt), limit: smallInt(p.limit) });
  const list = storeProducts.data ?? [];
  const monthly = list.find((x) => x.productId === 'pro_monthly');
  const yearly = list.find((x) => x.productId === 'pro_annual');
  const save = annualSaving(list);
  const billingAvailable = (products.data?.billingAvailable ?? true) && store.isAvailable();

  const refreshAll = () => {
    resetAdSession();
    return qc.invalidateQueries({ queryKey: queryKey(scope) });
  };

  const buy = async () => {
    if (!signedIn)
      return confirm({ title: 'Sign in first', body: 'Pro is tied to your Tactiq account.', confirm: 'Sign in', onConfirm: () => router.push('/sign-in') });
    setPhase({ k: 'processing', stage: 'store' });
    try {
      const r = await purchase(annual ? 'pro_annual' : 'pro_monthly', (stage) => setPhase({ k: 'processing', stage }));
      if (r.status === 'success' || r.status === 'pending') await refreshAll();
      setPhase({ k: 'done', r });
    } catch {
      setPhase({ k: 'done', r: { status: 'failed', message: 'Something went wrong.' } });
    }
  };

  const restore = async () => {
    if (!signedIn) return router.push('/sign-in');
    setRestoring(true);
    try {
      const r = await restorePurchases();
      await refreshAll();
      snack(r.plan.key !== 'free' ? 'Purchases restored. You are on Pro.' : 'No purchases to restore on this account.');
    } catch {
      snack("Couldn't restore purchases. Try again.");
    } finally {
      setRestoring(false);
    }
  };

  // design.md: a horizontal swipe over 55 dp, 1.6× more horizontal than vertical, flips the period.
  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (Math.abs(e.translationX) > motion.swipe.minDistance && Math.abs(e.translationX) > Math.abs(e.translationY) * motion.swipe.ratio) scheduleOnRN(setAnnual, e.translationX < 0);
    });

  const processing = phase.k === 'processing';
  const stageText = phase.k === 'processing' ? (phase.stage === 'store' ? 'Opening Google Play…' : phase.stage === 'retrying' ? 'Still confirming. This is safe to wait for.' : 'Confirming your purchase…') : '';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}>
        <Row>
          <View style={{ flex: 1 }} />
          <IconButton icon="close" label="Close" onPress={close} />
        </Row>
        {phase.k === 'done' ? (
          <View style={{ marginTop: 20 }}>
            <ResultView r={{ status: phase.r.status, requestId: phase.r.status === 'failed' ? phase.r.requestId : null }} onClose={close} onRetry={() => setPhase({ k: 'idle' })} />
          </View>
        ) : isPro ? (
          <View style={{ marginTop: 20 }}>
            <ResultView r={{ status: 'success' }} onClose={close} onRetry={() => {}} />
          </View>
        ) : (
          <GestureDetector gesture={swipe}>
            <View>
              <Deco width={110} style={{ position: 'absolute', left: -34, top: 0 }} />
              <Deco width={110} mirror style={{ position: 'absolute', right: -34, top: 0 }} />
              <Rise style={{ alignItems: 'center' }}>
                <Eyebrow icon="bolt">Tactiq Pro</Eyebrow>
                <T v="display" align="center" style={{ marginTop: 22 }}>
                  {'Go deeper on\n'}
                  <T v="display">every match</T>
                </T>
                <T v="body" align="center" style={{ marginTop: 14, maxWidth: 330, fontSize: 14.5 }} accessibilityRole="alert">
                  {line}
                </T>
                <T v="caption" color="muted" align="center" style={{ marginTop: 6 }}>
                  Match stories, insights and the timeline stay free.
                </T>
                {billingAvailable ? (
                  <>
                    <View style={{ marginTop: 30 }}>
                      <Toggle value={annual} onChange={setAnnual} left="Monthly" right="Annual" label="Billing period" />
                    </View>
                    <T v="eyebrow" tint={c.faint} style={{ marginTop: 13, opacity: annual ? 1 : 0.4, fontSize: 10.5, letterSpacing: 0.84 }}>
                      {save ? `(SAVE ${save}%)` : ' '}
                    </T>
                  </>
                ) : null}
              </Rise>
              <Rise index={1} style={{ marginTop: 26, gap: 16 }}>
                <PlanCard
                  theme="light"
                  tag="Free"
                  amount="£0"
                  period={annual ? 'Free, every year' : 'Free, every month'}
                  swapKey={annual ? 'y' : 'm'}
                  featuresTitle="Always included:"
                  features={[{ text: 'Match stories, insights, timeline' }, { text: '20 analysed matches a month' }, { text: '5 comparisons a month' }]}
                  cta="Not now"
                  onCta={close}
                />
                <PlanCard
                  theme="dark"
                  tag="Pro"
                  tagIcon="bolt"
                  amount={billingAvailable ? ((annual ? yearly?.price : monthly?.price) ?? '…') : 'Soon'}
                  period={
                    billingAvailable
                      ? annual
                        ? `Per year${yearly && monthly ? `, about £${(yearly.priceMicros / 12 / 1_000_000).toFixed(2)} a month` : ''}`
                        : 'Per month, cancel any time'
                      : 'Pro is coming soon'
                  }
                  swapKey={annual ? 'y' : 'm'}
                  featuresTitle="Everything in Free, plus:"
                  features={[{ text: 'Unlimited match analysis' }, { text: 'Event and possession filters' }, { text: 'Every past season, no ads' }]}
                  cta={billingAvailable ? (processing ? stageText : 'Start Pro') : undefined}
                  ctaLoading={processing}
                  onCta={buy}
                  footnote={billingAvailable ? 'Renews automatically. Cancel any time in Google Play.' : "Purchases aren't available yet."}
                />
              </Rise>
              {processing ? (
                <Row gap={8} style={{ marginTop: 14, justifyContent: 'center' }} >
                  <Icon name="lock" size={16} color={c.muted} />
                  <T v="caption" color="muted" accessibilityLiveRegion="polite">
                    {stageText} You won't be charged twice.
                  </T>
                </Row>
              ) : null}
              <Rise index={2} style={{ marginTop: 28 }}>
                <T v="title" style={{ marginBottom: 12 }}>
                  Free vs Pro
                </T>
                {products.data ? <Comparison data={products.data} /> : null}
              </Rise>
              <Stack gap={8} style={{ marginTop: 22 }}>
                <Button label="Restore purchases" variant="secondary" loading={restoring} onPress={restore} />
                <Button label="Not now" variant="text" onPress={close} />
                <T v="caption" color="muted" align="center">
                  Prices come from Google Play and include tax where it applies. Subscriptions renew automatically until cancelled in Google Play.
                </T>
                {!signedIn ? (
                  <Button label="Sign in to subscribe" variant="text" onPress={() => { authActions.browse(); router.push('/sign-in'); }} />
                ) : null}
              </Stack>
            </View>
          </GestureDetector>
        )}
      </ScrollView>
      {processing ? (
        <Animated.View
          entering={FadeInDown.duration(250)}
          exiting={FadeOutDown.duration(200)}
          accessibilityLiveRegion="polite"
          style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16, backgroundColor: '#0c1112', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
          <ActivityIndicator color="#cdf348" />
          <View style={{ flex: 1 }}>
            <T v="labelSm" tint="#f2f5f6">
              {stageText}
            </T>
            <T v="caption" tint="#a9b0b3">
              Safe to wait or retry. You won't be charged twice.
            </T>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
