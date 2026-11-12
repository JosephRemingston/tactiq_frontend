import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useMetricDefinitions, useMetrics } from '@/api/hooks';
import type { MatchDetail, Metric, MetricDefLite, MetricScope } from '@/api/types';
import { LaneShares, MetricTile } from '@/components/MetricTile';
import { QueryBoundary } from '@/components/QueryBoundary';
import { AnalysisScreen, AnalysisSkeleton, ScopeChips, SCOPE_LABEL, useMatchParam } from '@/features/analysis/AnalysisScreen';
import { Row, SectionHeader, Stack } from '@/ui/bits';
import { Chip, ChipBar } from '@/ui/Chip';
import { Rise } from '@/ui/motion';
import { T } from '@/ui/Text';
import { TeamChip } from '@/components/TeamChip';

const FAMILIES: { key: string; title: string; sub: string }[] = [
  { key: 'possession', title: 'Possession', sub: 'How much of the ball, and what it led to' },
  { key: 'passing', title: 'Passing', sub: 'Volume, accuracy and chance creation' },
  { key: 'progression', title: 'Progression', sub: 'Moving the ball towards goal' },
  { key: 'buildup', title: 'Build-up', sub: 'Getting out from the back' },
  { key: 'pressing', title: 'Pressing', sub: 'Winning the ball back' },
  { key: 'transition', title: 'Transitions', sub: 'The seconds after the ball changes hands' },
  { key: 'shooting', title: 'Shooting', sub: 'Chances and finishing' },
];

/** Keys drawn elsewhere (Shape, Shot map) or shown as lane breakdowns. */
const SKIP = new Set(['passing.network', 'shape.avg_positions', 'shape.starting_formation', 'shape.formation_timeline', 'shooting.shot_map', 'possession.xt_by_lane', 'progression.by_lane']);
const LANES: Record<string, string> = { 'possession.xt_by_lane': 'Threat added by lane (xT share)', 'progression.by_lane': 'Progression by lane' };

function Body({ match, data, defs, scope, family, highlight }: { match: MatchDetail; data: { metrics: Metric[]; definitions?: MetricDefLite[] }; defs: Map<string, MetricDefLite & { family?: string }>; scope: MetricScope; family: string | null; highlight: string[] }) {
  const rows = data.metrics.filter((m) => m.scope === scope && !m.playerId);
  const byKey = new Map<string, { home?: Metric; away?: Metric }>();
  rows.forEach((m) => {
    const cur = byKey.get(m.key) ?? {};
    if (m.teamId === match.home.id) cur.home = m;
    else if (m.teamId === match.away.id) cur.away = m;
    byKey.set(m.key, cur);
  });
  const familyOf = (k: string) => (defs.get(k) as { family?: string } | undefined)?.family ?? k.split('.')[0];
  const fams = FAMILIES.filter((f) => !family || f.key === family);
  return (
    <Stack gap={28}>
      {fams.map((f, fi) => {
        const keys = [...byKey.keys()].filter((k) => familyOf(k) === f.key && !SKIP.has(k));
        const lanes = [...byKey.keys()].filter((k) => familyOf(k) === f.key && LANES[k]);
        if (!keys.length && !lanes.length) return null;
        return (
          <Rise key={f.key} index={fi}>
            <SectionHeader title={f.title} sub={f.sub} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {keys.map((k) => {
                const v = byKey.get(k)!;
                return (
                  <View key={k} style={{ width: '48.5%', flexGrow: 1 }}>
                    <MetricTile
                      metricKey={k}
                      def={defs.get(k)}
                      home={v.home}
                      away={v.away}
                      homeName={match.home.name}
                      awayName={match.away.name}
                      highlighted={highlight.includes(k)}
                    />
                  </View>
                );
              })}
            </View>
            {lanes.map((k) => {
              const v = byKey.get(k)!;
              const shares = (m?: Metric) => (m?.valueJson as { shares?: Record<string, number> } | undefined)?.shares;
              return (
                <View key={k} style={{ marginTop: 10 }}>
                  <LaneShares title={LANES[k]} home={shares(v.home)} away={shares(v.away)} homeName={match.home.name} awayName={match.away.name} />
                </View>
              );
            })}
          </Rise>
        );
      })}
    </Stack>
  );
}

/** Screen 19, Metrics: grouped by family, each metric a tile with home v away values. Metered. */
export default function MetricsView() {
  const p = useMatchParam();
  const [scope, setScope] = useState<MetricScope>(p.scope ?? 'full');
  const [family, setFamily] = useState<string | null>(p.family && FAMILIES.some((f) => f.key === p.family) ? p.family : null);
  const highlight = useMemo(() => (p.keys ? p.keys.split(',') : []), [p.keys]);
  const all = useMetricDefinitions();
  return (
    <AnalysisScreen title="Metrics">
      {(match) => <Inner match={match} scope={scope} setScope={setScope} family={family} setFamily={setFamily} highlight={highlight} allDefs={all.byKey} />}
    </AnalysisScreen>
  );
}

function Inner({
  match,
  scope,
  setScope,
  family,
  setFamily,
  highlight,
  allDefs,
}: {
  match: MatchDetail;
  scope: MetricScope;
  setScope: (s: MetricScope) => void;
  family: string | null;
  setFamily: (f: string | null) => void;
  highlight: string[];
  allDefs: Map<string, MetricDefLite & { family?: string }>;
}) {
  const q = useMetrics(match.id, { playerId: 'none' }, true);
  const available = useMemo(() => [...new Set((q.data?.metrics ?? []).map((m) => m.scope))] as MetricScope[], [q.data]);
  const defs = useMemo(() => {
    const m = new Map<string, MetricDefLite & { family?: string }>(allDefs);
    q.data?.definitions?.forEach((d) => m.set(d.key, { ...(allDefs.get(d.key) ?? {}), ...d }));
    return m;
  }, [q.data, allDefs]);
  return (
    <Stack gap={16}>
      <Row gap={8}>
        <TeamChip name={match.home.name} side="home" />
        <View style={{ flex: 1 }} />
        <TeamChip name={match.away.name} side="away" />
      </Row>
      <ScopeChips value={scope} onChange={setScope} available={available.length ? available : ['full', '1H', '2H']} />
      <ChipBar>
        <Chip label="All families" selected={!family} onPress={() => setFamily(null)} />
        {FAMILIES.map((f) => (
          <Chip key={f.key} label={f.title} selected={family === f.key} onPress={() => setFamily(family === f.key ? null : f.key)} />
        ))}
      </ChipBar>
      <T v="caption" color="muted">
        {SCOPE_LABEL[scope]}. Tap any metric to see what it means. Left is {match.home.name}, right is {match.away.name}.
      </T>
      <QueryBoundary query={q} skeleton={<AnalysisSkeleton />} allowForced={[]}>
        {(d) => <Body match={match} data={d} defs={defs} scope={scope} family={family} highlight={highlight} />}
      </QueryBoundary>
    </Stack>
  );
}
