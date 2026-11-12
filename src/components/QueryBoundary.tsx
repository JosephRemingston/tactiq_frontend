import type { ReactNode } from 'react';

import { ApiError } from '@/api/errors';
import { useDev, type ForcedState } from '@/dev/devStore';
import { contextForFeature, type PaywallContext } from '@/services/paywall';
import {
  CardsSkeleton,
  EmptyState,
  ErrorBlock,
  LimitReached,
  NoEventData,
  NotAnalysed,
  NotFound,
  OfflineBanner,
  ProOnly,
  RateLimited,
  SignedOutCard,
} from './states';

type Q<T> = { data: T | undefined; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown; isPlaceholderData?: boolean };

export type BoundaryOptions<T> = {
  /** Skeleton while loading; defaults to card skeletons. */
  skeleton?: ReactNode;
  /** True when loaded data counts as empty. */
  isEmpty?: (d: T) => boolean;
  empty?: ReactNode;
  /** What a Pro-only 403 should say. */
  proOnlyLine?: string;
  paywallHint?: PaywallContext;
  /** Copy for signed-out 401s. */
  signedOutBody?: string;
  /** 409 CONFLICT on analysis means "not analysed". */
  onConflict?: ReactNode;
  /** Which forced states make sense here; others are ignored. */
  allowForced?: ForcedState[];
};

/** Renders the state for a forced dev state. Shared so screens can force states on their own blocks. */
export function renderForced(f: ForcedState, o: { proOnlyLine?: string; paywallHint?: PaywallContext; skeleton?: ReactNode; empty?: ReactNode; signedOutBody?: string }) {
  switch (f) {
    case 'loading':
      return o.skeleton ?? <CardsSkeleton />;
    case 'empty':
      return o.empty ?? <EmptyState title="Nothing here yet" body="When there is something to show, it will appear here." />;
    case 'signedOut':
      return <SignedOutCard body={o.signedOutBody} />;
    case 'notAnalysed':
      return <NotAnalysed onRequest={() => {}} />;
    case 'queued':
      return <NotAnalysed queued />;
    case 'noEvents':
      return <NoEventData />;
    case 'limit':
      return <LimitReached limit={20} resetsAt={new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString()} />;
    case 'proOnly':
      return <ProOnly line={o.proOnlyLine ?? 'This is part of Pro.'} context={o.paywallHint} />;
    case 'error':
      return <ErrorBlock requestId="01a1cee9-6a9b-7a6e-9cee-d20740adf064" onRetry={() => {}} />;
    case 'rateLimited':
      return <RateLimited seconds={30} onRetry={() => {}} />;
    case 'offline':
      return (
        <>
          <OfflineBanner force />
          <ErrorBlock message="You're offline and this hasn't been saved on this device yet." onRetry={() => {}} />
        </>
      );
    case 'notFound':
      return <NotFound />;
  }
}

/**
 * Maps a query to the brief's screen states, in priority order: dev-forced, loading, error by
 * code (signed out, limit reached, Pro only, not found, not analysed, rate limited, offline,
 * error with reference), empty, then the content.
 */
export function QueryBoundary<T>({ query, children, ...o }: BoundaryOptions<T> & { query: Q<T>; children: (data: T) => ReactNode }) {
  const forced = useDev((s) => s.forced);
  if (__DEV__ && forced && (!o.allowForced || o.allowForced.includes(forced))) return <>{renderForced(forced, o)}</>;

  if (query.isLoading && !query.data) return <>{o.skeleton ?? <CardsSkeleton />}</>;

  if (query.isError && !query.data) {
    const e = query.error;
    if (e instanceof ApiError) {
      if (e.status === 401) return <SignedOutCard body={o.signedOutBody} />;
      const pw = e.paywall;
      if (e.code === 'ENTITLEMENT_EXCEEDED' && pw) {
        const ctx = contextForFeature(pw.featureKey, o.paywallHint);
        return <LimitReached limit={pw.limit} resetsAt={pw.resetsAt} context={ctx} />;
      }
      if (e.code === 'ENTITLEMENT_REQUIRED' && pw) {
        const ctx = contextForFeature(pw.featureKey, o.paywallHint);
        const line =
          ctx === 'older_season' ? 'Older seasons are part of Pro. Stories and timelines stay free.' : (o.proOnlyLine ?? 'This is part of Pro.');
        return <ProOnly line={line} context={ctx} />;
      }
      if (e.status === 404) return <NotFound />;
      if (e.status === 409) return <>{o.onConflict ?? <NotAnalysed />}</>;
      if (e.code === 'RATE_LIMITED') return <RateLimited seconds={e.retryAfter ?? 30} onRetry={() => query.refetch()} />;
      if (e.isOffline)
        return (
          <ErrorBlock message="You're offline and this hasn't been saved on this device yet. Connect and try again." onRetry={() => query.refetch()} />
        );
      return <ErrorBlock message={e.status >= 500 ? undefined : e.message} requestId={e.requestId} onRetry={() => query.refetch()} />;
    }
    return <ErrorBlock onRetry={() => query.refetch()} />;
  }

  if (query.data !== undefined && o.isEmpty?.(query.data)) return <>{o.empty ?? <EmptyState title="Nothing here yet" />}</>;
  if (query.data === undefined) return <>{o.skeleton ?? <CardsSkeleton />}</>;
  return <>{children(query.data)}</>;
}
