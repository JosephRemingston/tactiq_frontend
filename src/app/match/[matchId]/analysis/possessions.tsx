import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAllEvents, useIsPro, usePossessions } from '@/api/hooks';
import type { EndType, MatchDetail, Possession } from '@/api/types';
import { QueryBoundary } from '@/components/QueryBoundary';
import { EmptyState } from '@/components/states';
import { AnalysisScreen, AnalysisSkeleton } from '@/features/analysis/AnalysisScreen';
import { useMatchCtx } from '@/features/match/context';
import { fmtNum, PERIOD_LABEL } from '@/lib/format';
import { ChainLayer } from '@/pitch/layers';
import { PitchCanvas } from '@/pitch/PitchCanvas';
import { openPaywall } from '@/services/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Row, Stack } from '@/ui/bits';
import { Chip, ChipBar } from '@/ui/Chip';
import { Icon } from '@/ui/Icon';
import { Lift } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { T } from '@/ui/Text';

const END: Record<EndType, { label: string; icon: string }> = {
  goal: { label: 'Goal', icon: 'sports_soccer' },
  shot: { label: 'Shot', icon: 'ads_click' },
  turnover: { label: 'Turnover', icon: 'swap_horiz' },
  out: { label: 'Out of play', icon: 'logout' },
  foul: { label: 'Foul', icon: 'gavel' },
  half_end: { label: 'Half ended', icon: 'stop_circle' },
  other: { label: 'Other', icon: 'more_horiz' },
};

const clock = (secs: number, period: number) => {
  const base = period === 2 ? 45 : period === 3 ? 90 : period === 4 ? 105 : period === 5 ? 120 : 0;
  const m = Math.floor(secs / 60) + base;
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

function ReplaySheet({ match, p }: { match: MatchDetail; p: Possession }) {
  const events = useAllEvents(match.id);
  const { sideOf, nameOf } = useMatchCtx();
  const [key, setKey] = useState(0);
  const chain = useMemo(
    () => (events.data ?? []).filter((e) => e.possessionId === p.possessionId && e.period === p.period && e.teamId === p.teamId).sort((a, b) => a.sequenceIndex - b.sequenceIndex),
    [events.data, p],
  );
  const side = sideOf(p.teamId) ?? 'home';
  const summary = `${nameOf(p.teamId)} possession, ${p.nPasses} passes, ended in ${END[p.endType].label.toLowerCase()}${p.reachedBox ? ', reached the box' : p.reachedFinalThird ? ', reached the final third' : ''}.`;
  return (
    <Stack gap={14}>
      <T v="body">{summary}</T>
      {events.isLoading ? (
        <ActivityIndicator />
      ) : (
        <PitchCanvas label={`Replay: ${summary}`} zones={['thirds']}>
          {(s) => <ChainLayer key={key} s={s} events={chain} side={side} replayKey={key} />}
        </PitchCanvas>
      )}
      <Row gap={8} wrap>
        <Tag size="sm" icon="trending_up">{`xT ${fmtNum(p.xtNet, 3)}`}</Tag>
        <Tag size="sm" icon="sports_soccer">{`xG ${fmtNum(p.xgTotal, 2)}`}</Tag>
        <Tag size="sm">{`${p.nEvents} events`}</Tag>
      </Row>
      <T v="caption" color="muted">
        Solid arrows are passes, dashed are carries.
      </T>
      <Button label="Replay" variant="secondary" icon="replay" chevron={false} onPress={() => setKey((k) => k + 1)} />
    </Stack>
  );
}

function PossessionRow({ p, onPress }: { p: Possession; onPress: () => void }) {
  const { c } = useTheme();
  const { codeOf, sideOf } = useMatchCtx();
  const side = sideOf(p.teamId);
  const e = END[p.endType] ?? END.other;
  const strong = p.endType === 'goal' || p.endType === 'shot';
  return (
    <Lift
      kind="card"
      onPress={onPress}
      accessibilityLabel={`${codeOf(p.teamId)}, ${PERIOD_LABEL[p.period]}, ${clock(p.startClock, p.period)}. ${p.nPasses} passes, ${e.label}. xT ${fmtNum(p.xtNet, 3)}, xG ${fmtNum(p.xgTotal, 2)}`}
      style={{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: strong ? (c.name === 'dark' ? c.lime : c.ink) : c.cardLine, padding: 14, gap: 8 }}>
      <Row gap={10}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: side === 'home' ? c.home : 'transparent', borderWidth: side === 'home' ? 0 : 2, borderColor: c.away }} />
        <T v="labelSm">{codeOf(p.teamId)}</T>
        <T v="caption" color="muted" num>
          {PERIOD_LABEL[p.period]?.replace('Extra time, ', 'ET ')} · {clock(p.startClock, p.period)}
        </T>
        <View style={{ flex: 1 }} />
        <Icon name={e.icon} size={18} color={strong ? c.ink : c.muted} />
        <T v="labelSm" tint={strong ? c.ink : c.muted}>
          {e.label}
        </T>
      </Row>
      <Row gap={8} wrap>
        <T v="caption" color="inkSecondary" num>
          {p.nPasses} passes · started {fmtNum(p.startX, 0)} m upfield
        </T>
        {p.reachedBox ? <Tag size="sm">Box</Tag> : p.reachedFinalThird ? <Tag size="sm">Final third</Tag> : null}
        <View style={{ flex: 1 }} />
        <T v="caption" color="muted" num>
          xT {fmtNum(p.xtNet, 3)} · xG {fmtNum(p.xgTotal, 2)}
        </T>
      </Row>
    </Lift>
  );
}

function Body({ match }: { match: MatchDetail }) {
  const { isPro } = useIsPro();
  const { openSheet } = useOverlay();
  const [teamId, setTeamId] = useState<string | undefined>();
  const [endType, setEndType] = useState<EndType | undefined>();
  const q = usePossessions(match.id, { teamId, endType }, true);
  const rows = useMemo(() => q.data?.pages.flatMap((pg) => pg.possessions) ?? [], [q.data]);
  const lock = () => openPaywall({ context: 'possession_filters' });
  return (
    <Stack gap={14}>
      <ChipBar>
        {[match.home, match.away].map((t) => (
          <Chip key={t.id} label={t.name} locked={!isPro} selected={teamId === t.id} onPress={() => (isPro ? setTeamId(teamId === t.id ? undefined : t.id) : lock())} />
        ))}
        {(['goal', 'shot', 'turnover', 'out', 'foul'] as EndType[]).map((e) => (
          <Chip key={e} label={END[e].label} locked={!isPro} selected={endType === e} onPress={() => (isPro ? setEndType(endType === e ? undefined : e) : lock())} />
        ))}
      </ChipBar>
      {!isPro ? (
        <T v="caption" color="muted">
          Team and outcome filters are part of Pro. The full list is yours either way.
        </T>
      ) : null}
      <QueryBoundary query={q} skeleton={<AnalysisSkeleton />} allowForced={[]} proOnlyLine="Possession filters are a Pro feature." paywallHint="possession_filters">
        {() =>
          rows.length ? (
            <Stack gap={10}>
              {rows.map((p) => (
                <PossessionRow key={`${p.period}:${p.possessionId}`} p={p} onPress={() => openSheet(<ReplaySheet match={match} p={p} />, { title: `Possession ${p.possessionId}` })} />
              ))}
              {q.hasNextPage ? <Button label="Load more" variant="secondary" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} /> : null}
            </Stack>
          ) : (
            <EmptyState icon="filter_alt_off" title="No possessions match" body="Try removing a filter." />
          )
        }
      </QueryBoundary>
    </Stack>
  );
}

/** Screen 23, Possessions: possession chains with replay. Filters are Pro. Metered. */
export default function PossessionsView() {
  return <AnalysisScreen title="Possessions">{(m) => <Body match={m} />}</AnalysisScreen>;
}
