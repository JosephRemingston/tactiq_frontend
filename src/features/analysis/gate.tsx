import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { api } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import { queryKey, useEntitlement, useMatch, useUserScope } from '@/api/hooks';
import type { MatchDetail } from '@/api/types';
import { renderForced } from '@/components/QueryBoundary';
import { CardsSkeleton, ErrorBlock, LimitReached, NoEventData, NotAnalysed, SignedOutCard } from '@/components/states';
import { useDev } from '@/dev/devStore';
import { fmtDayMonth } from '@/lib/format';
import { useSignedIn } from '@/services/auth';
import { openPaywallFor } from '@/services/paywall';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { T } from '@/ui/Text';

export type Access =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'noEvents' }
  | { kind: 'notAnalysed'; queued: boolean }
  | { kind: 'limit'; limit: number | null; resetsAt: string | null }
  | { kind: 'confirm'; remaining: number; limit: number; resetsAt: string | null }
  | { kind: 'ok'; unlimited: boolean; remaining: number | null; limit: number | null };

/**
 * Whether analysis views for this match can load now. One unit per match per calendar month;
 * re-opening a match already opened this month is free (tracked locally, enforced by the server).
 */
export function useAnalysisAccess(matchId: string): { access: Access; match: MatchDetail | undefined; confirm: () => void } {
  const signedIn = useSignedIn();
  const m = useMatch(matchId);
  const ent = useEntitlement('analysis.matches_per_month');
  const opened = useSettings((s) => s.meteredOpened);
  const markMetered = useSettings((s) => s.markMetered);
  const e = ent.ent;
  const key = e?.periodKey ? `${e.periodKey}:${matchId}` : null;
  const confirm = () => key && markMetered(key);

  const match = m.data?.match;
  let access: Access;
  if (!signedIn) access = { kind: 'signedOut' };
  else if (!match || ent.isLoading) access = { kind: 'loading' };
  else if (!match.coverage.hasEvents || match.coverage.level === 'fixtures_only') access = { kind: 'noEvents' };
  else if (match.analysisStatus !== 'complete') access = { kind: 'notAnalysed', queued: match.analysisStatus === 'queued' || match.analysisStatus === 'running' };
  else if (!e || e.limitValue === null) access = { kind: 'ok', unlimited: true, remaining: null, limit: null };
  else if (key && opened.includes(key)) access = { kind: 'ok', unlimited: false, remaining: e.remaining, limit: e.limitValue };
  else if ((e.remaining ?? 0) <= 0) access = { kind: 'limit', limit: e.limitValue, resetsAt: e.resetsAt };
  else access = { kind: 'confirm', remaining: e.remaining ?? 0, limit: e.limitValue, resetsAt: e.resetsAt };
  return { access, match, confirm };
}

/** Remaining-count chip: "17 of 20 left this month" or "Unlimited". */
export function RemainingChip() {
  const ent = useEntitlement('analysis.matches_per_month');
  if (!ent.ent) return null;
  if (ent.ent.limitValue === null)
    return (
      <Tag size="sm" tone="lime" icon="all_inclusive">
        Unlimited
      </Tag>
    );
  return (
    <Tag size="sm" icon="data_usage" tone={(ent.ent.remaining ?? 0) <= 3 ? 'warning' : 'neutral'}>
      {`${ent.ent.remaining} of ${ent.ent.limitValue} left this month`}
    </Tag>
  );
}

function ConfirmBody({ remaining, limit, resetsAt, onConfirm, onCancel }: { remaining: number; limit: number; resetsAt: string | null; onConfirm: () => void; onCancel: () => void }) {
  const { c } = useTheme();
  return (
    <Stack gap={16}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.lime, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="query_stats" color={c.onLime} />
        </View>
        <T v="body" style={{ flex: 1 }}>
          Opening analysis uses <T v="bodyStrong">1 of your {remaining} remaining</T> matches this month.
        </T>
      </View>
      <T v="bodySm" color="muted">
        Once it's open, every view for this match is included until {resetsAt ? fmtDayMonth(resetsAt) : 'the month ends'}. Free includes {limit} analysed matches a month; stories, insights and the timeline never count.
      </T>
      <Button label="Open analysis" onPress={onConfirm} />
      <Button label="Not now" variant="text" onPress={onCancel} />
    </Stack>
  );
}

/**
 * Wraps every analysis view. Shows the right state, asks before the first metered call of a
 * match this month, then renders the view. Server 403s still land in each view's QueryBoundary.
 */
export function AnalysisGate({ matchId, children, onRequestAnalysis }: { matchId: string; children: ReactNode; onRequestAnalysis?: () => void }) {
  const { access, confirm } = useAnalysisAccess(matchId);
  const { openSheet, closeSheet } = useOverlay();
  const forced = useDev((s) => s.forced);
  const asked = useRef(false);

  useEffect(() => {
    if (access.kind === 'confirm' && !asked.current) {
      asked.current = true;
      openSheet(
        <ConfirmBody
          remaining={access.remaining}
          limit={access.limit}
          resetsAt={access.resetsAt}
          onConfirm={() => {
            confirm();
            closeSheet();
          }}
          onCancel={closeSheet}
        />,
        { title: 'Open detailed analysis?' },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.kind]);

  if (__DEV__ && forced) return <>{renderForced(forced, { paywallHint: 'analysis_limit', proOnlyLine: 'Older seasons are part of Pro.' })}</>;

  switch (access.kind) {
    case 'loading':
      return <CardsSkeleton count={2} pitch />;
    case 'signedOut':
      return <SignedOutCard body="Detailed analysis needs an account. It's free for 20 matches a month." />;
    case 'noEvents':
      return <NoEventData />;
    case 'notAnalysed':
      return <NotAnalysed queued={access.queued} onRequest={onRequestAnalysis} />;
    case 'limit':
      return <LimitReached limit={access.limit} resetsAt={access.resetsAt} />;
    case 'confirm':
      return (
        <Card>
          <Stack gap={12}>
            <T v="titleSm">This match isn't open yet</T>
            <T v="bodySm" color="muted">
              {`Opening it uses 1 of your ${access.remaining} remaining analysed matches this month.`}
            </T>
            <Button
              label="Open analysis"
              onPress={() =>
                openSheet(
                  <ConfirmBody remaining={access.remaining} limit={access.limit} resetsAt={access.resetsAt} onConfirm={() => { confirm(); closeSheet(); }} onCancel={closeSheet} />,
                  { title: 'Open detailed analysis?' },
                )
              }
            />
          </Stack>
        </Card>
      );
    default:
      return <>{children}</>;
  }
}

/** Screen 26, Request re-analysis: runs within about an hour; Free 3 a month, Pro 30. */
export function ReanalysisSheet({ matchId }: { matchId: string }) {
  const ent = useEntitlement('analysis.rerun_per_month');
  const qc = useQueryClient();
  const scope = useUserScope();
  const { closeSheet, snack } = useOverlay();
  const [state, setState] = useState<{ phase: 'idle' | 'sending' | 'queued' | 'existing' | 'error'; message?: string; requestId?: string | null }>({ phase: 'idle' });
  const e = ent.ent;
  const send = async () => {
    setState({ phase: 'sending' });
    try {
      const r = await api.requestAnalysis(matchId);
      setState({ phase: r.data.job.existing ? 'existing' : 'queued' });
      qc.invalidateQueries({ queryKey: queryKey(scope, 'entitlements') });
      qc.invalidateQueries({ queryKey: queryKey(scope, 'match', matchId) });
    } catch (err) {
      if (err instanceof ApiError && err.paywall) {
        closeSheet();
        openPaywallFor(err.paywall, 'rerun_limit');
        return;
      }
      if (err instanceof ApiError && err.status === 409) return setState({ phase: 'error', message: 'This match has no event data, so it cannot be analysed.' });
      if (err instanceof ApiError && err.code === 'RATE_LIMITED') return setState({ phase: 'error', message: `Slow down a moment. Try again in ${err.retryAfter ?? 60} s.` });
      setState({ phase: 'error', message: "Couldn't send the request.", requestId: err instanceof ApiError ? err.requestId : null });
    }
  };
  if (state.phase === 'queued' || state.phase === 'existing')
    return (
      <Stack gap={14}>
        <Tag tone={state.phase === 'queued' ? 'warning' : 'lime'} icon={state.phase === 'queued' ? 'schedule' : 'check_circle'}>
          {state.phase === 'queued' ? 'Queued' : 'Already up to date'}
        </Tag>
        <T v="body">
          {state.phase === 'queued'
            ? "We'll have this ready soon. Re-analysis runs on a schedule and usually finishes within an hour."
            : 'This match is already analysed or queued, so nothing was used from your allowance.'}
        </T>
        <Button
          label="Done"
          variant="ink"
          onPress={() => {
            closeSheet();
            if (state.phase === 'queued') snack('Re-analysis requested');
          }}
        />
      </Stack>
    );
  return (
    <Stack gap={14}>
      <T v="body">Runs the latest analysis again for this match. It usually finishes within about an hour; the match updates when it's done.</T>
      {e ? (
        <Tag icon="data_usage" tone={e.limitValue === null ? 'lime' : 'neutral'}>
          {e.limitValue === null ? 'Unlimited' : `Uses 1 of ${e.remaining} re-analyses left this month (${e.limitValue} a month)`}
        </Tag>
      ) : null}
      <T v="caption" color="muted">
        If the match is already analysed or queued, nothing is used.
      </T>
      {state.phase === 'error' ? <ErrorBlock message={state.message} requestId={state.requestId} /> : null}
      <Button label="Request re-analysis" onPress={send} loading={state.phase === 'sending'} />
    </Stack>
  );
}
