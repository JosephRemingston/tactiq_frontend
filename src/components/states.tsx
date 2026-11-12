import NetInfo from '@react-native-community/netinfo';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fmtDayMonth } from '@/lib/format';
import { openPaywall, type PaywallContext } from '@/services/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Deco, Skeleton, Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Rise } from '@/ui/motion';
import { Tag } from '@/ui/Pill';
import { T } from '@/ui/Text';

/** Round icon "illustration" over the design.md wireframe glyph. */
function Mark({ icon, tone = 'neutral' }: { icon: string; tone?: 'neutral' | 'error' | 'lime' }) {
  const { c } = useTheme();
  const bg = tone === 'error' ? c.errorSoft : tone === 'lime' ? c.lime : c.surfaceHigh;
  const fg = tone === 'error' ? c.error : tone === 'lime' ? c.onLime : c.ink;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 120 }}>
      <Deco width={86} style={{ position: 'absolute', opacity: 0.9 }} />
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={30} color={fg} />
      </View>
    </View>
  );
}

/** Generic state: illustration, one sentence, one action. */
export function StateBlock({
  icon,
  title,
  body,
  action,
  onAction,
  secondary,
  onSecondary,
  reference,
  tone,
  children,
  card = true,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
  secondary?: string;
  onSecondary?: () => void;
  reference?: string | null;
  tone?: 'neutral' | 'error' | 'lime';
  children?: ReactNode;
  card?: boolean;
}) {
  const inner = (
    <Stack gap={14} style={{ alignItems: 'center' }}>
      <Mark icon={icon} tone={tone} />
      <T v="title" align="center" accessibilityRole="header">
        {title}
      </T>
      {body ? (
        <T v="body" color="muted" align="center" style={{ maxWidth: 320 }}>
          {body}
        </T>
      ) : null}
      {children}
      {action ? <Button label={action} onPress={onAction} variant="ink" style={{ marginTop: 6 }} /> : null}
      {secondary ? <Button label={secondary} onPress={onSecondary} variant="text" /> : null}
      {reference ? (
        <T v="caption" color="faint" selectable>
          Reference: {reference}
        </T>
      ) : null}
    </Stack>
  );
  return <Rise>{card ? <Card>{inner}</Card> : <View style={{ paddingVertical: 24 }}>{inner}</View>}</Rise>;
}

export function EmptyState(p: { icon?: string; title: string; body?: string; action?: string; onAction?: () => void }) {
  return <StateBlock icon={p.icon ?? 'inbox'} title={p.title} body={p.body} action={p.action} onAction={p.onAction} />;
}

export function SignedOutCard({ body = 'Sign in to see this.' }: { body?: string }) {
  return (
    <StateBlock
      icon="lock_person"
      title="Sign in to see this"
      body={body}
      action="Sign in"
      onAction={() => router.push('/sign-in')}
    />
  );
}

export function ErrorBlock({ message, requestId, onRetry }: { message?: string; requestId?: string | null; onRetry?: () => void }) {
  return (
    <StateBlock
      icon="cloud_off"
      tone="error"
      title="Something went wrong"
      body={message ?? "We couldn't load this. Check your connection and try again."}
      action={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
      reference={requestId}
    />
  );
}

export function RateLimited({ seconds, onRetry }: { seconds: number; onRetry: () => void }) {
  const [left, setLeft] = useState(Math.max(1, Math.ceil(seconds)));
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <StateBlock
      icon="hourglass_top"
      title="Slow down a moment"
      body={left > 0 ? `Too many requests. You can try again in ${left} s.` : 'You can try again now.'}
      action={left > 0 ? undefined : 'Try again'}
      onAction={onRetry}
    />
  );
}

export function NotFound() {
  return (
    <StateBlock
      icon="search_off"
      title="This isn't available"
      body="It may have been removed, or it belongs to someone else."
      action="Go back"
      onAction={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}

export function NoEventData() {
  return (
    <StateBlock
      icon="scoreboard"
      title="We only have the score for this match"
      body="There is no event data for it, so there is no tactical analysis. The result and date are all we can show."
    />
  );
}

export function NotAnalysed({ queued, onRequest, requesting }: { queued?: boolean; onRequest?: () => void; requesting?: boolean }) {
  if (queued)
    return (
      <StateBlock
        icon="schedule"
        tone="lime"
        title="We'll have this ready soon"
        body="Analysis is queued. It usually takes up to an hour; this page updates when it is ready."
      />
    );
  return (
    <StateBlock
      icon="query_stats"
      title="Analysis not ready"
      body="We have the event data for this match, but it hasn't been analysed yet."
      action={onRequest ? (requesting ? 'Requesting…' : 'Request analysis') : undefined}
      onAction={onRequest}
    />
  );
}

/** Limit reached: the hero card with the reset date, in place of an analysis view. */
export function LimitReached({ limit, resetsAt, context = 'analysis_limit' }: { limit?: number | null; resetsAt?: string | null; context?: PaywallContext }) {
  const { c } = useTheme();
  const what = context === 'compare_limit' ? 'comparisons' : context === 'rerun_limit' ? 're-analysis requests' : 'analysed matches';
  return (
    <Rise>
      <Card variant="hero">
        <Tag onHero icon="bolt">
          Free limit reached
        </Tag>
        <T v="headline" tint={c.heroInk} style={{ marginTop: 18 }}>
          {`You've used all ${limit ?? ''} ${what} this month`.replace('  ', ' ')}
        </T>
        <T v="body" tint={c.heroMuted} style={{ marginTop: 10 }}>
          {resetsAt ? `Your allowance resets on ${fmtDayMonth(resetsAt)}. ` : ''}Stories, insights and the timeline stay free.
        </T>
        <View style={{ height: 22 }} />
        <Button label="See Pro" onPress={() => openPaywall({ context, resetsAt, limit })} />
      </Card>
    </Rise>
  );
}

/** Pro only: lock + one line + See Pro. */
export function ProOnly({ line, context = 'upgrade', compact }: { line: string; context?: PaywallContext; compact?: boolean }) {
  const { c } = useTheme();
  if (compact) {
    return (
      <Card variant="tint" padded={false} onPress={() => openPaywall({ context })} accessibilityLabel={`${line} See Pro`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          <Icon name="lock" size={20} color={c.ink} />
          <T v="bodySm" style={{ flex: 1 }}>
            {line}
          </T>
          <T v="labelSm" style={{ textDecorationLine: 'underline' }}>
            See Pro
          </T>
        </View>
      </Card>
    );
  }
  return <StateBlock icon="lock" title="Pro only" body={line} action="See Pro" onAction={() => openPaywall({ context })} />;
}

/** Skeleton shaped like a stack of cards. */
export function CardsSkeleton({ count = 3, pitch }: { count?: number; pitch?: boolean }) {
  return (
    <Stack gap={14} >
      {pitch ? (
        <Card>
          <Skeleton h={180} r={12} />
        </Card>
      ) : null}
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <Stack gap={10}>
            <Skeleton w="35%" h={10} />
            <Skeleton h={18} />
            <Skeleton w="70%" h={18} />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

/** Top banner while offline; cached content stays readable underneath. */
export function OfflineBanner({ force }: { force?: boolean }) {
  const [offline, setOffline] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => NetInfo.addEventListener((s) => setOffline(s.isConnected === false)), []);
  if (!offline && !force) return null;
  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      exiting={FadeOutUp.duration(250)}
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 6, paddingBottom: 8, paddingHorizontal: 16, backgroundColor: '#0c1112', zIndex: 50, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name="wifi_off" size={18} color="#cdf348" />
      <T v="labelSm" tint="#f2f5f6" style={{ flex: 1 }}>
        You're offline. Showing what was saved on this device.
      </T>
    </Animated.View>
  );
}
