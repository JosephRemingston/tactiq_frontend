import { guardParams } from '@/components/ParamGuard';
import { useMetricDefinitions, useTransitions } from '@/api/hooks';
import type { MatchDetail, MetricValue, Transitions } from '@/api/types';
import { BarGroup } from '@/charts/charts';
import { ChartFrame } from '@/components/ChartFrame';
import { MetricTile } from '@/components/MetricTile';
import { QueryBoundary } from '@/components/QueryBoundary';
import { AnalysisScreen, AnalysisSkeleton } from '@/features/analysis/AnalysisScreen';
import { fmtNum } from '@/lib/format';
import { Legend } from '@/pitch/Legend';
import { useTheme } from '@/theme/ThemeProvider';
import { Stack } from '@/ui/bits';
import { T } from '@/ui/Text';
import { View } from 'react-native';

const get = (t: Transitions, teamId: string, key: string): MetricValue | null => t.teams.find((x) => x.teamId === teamId)?.scopes.full?.[key] ?? null;
const windows = (m: MetricValue | null) => (m?.valueJson as { windows?: Record<string, number>; turnovers?: number } | undefined) ?? {};

function Body({ match, data }: { match: MatchDetail; data: Transitions }) {
  const { c } = useTheme();
  const defs = useMetricDefinitions();
  const h = match.home.id;
  const a = match.away.id;
  const hr = windows(get(data, h, 'transition.counterpress_regains'));
  const ar = windows(get(data, a, 'transition.counterpress_regains'));
  const groups = ['3s', '5s', '8s'].map((w) => ({ label: `Within ${w.replace('s', ' s')}`, home: hr.windows?.[w] ?? 0, away: ar.windows?.[w] ?? 0 }));
  const hRate = get(data, h, 'transition.counterpress_regain_rate')?.value ?? null;
  const aRate = get(data, a, 'transition.counterpress_regain_rate')?.value ?? null;
  const lead = hRate !== null && aRate !== null ? (hRate >= aRate ? match.home.name : match.away.name) : null;
  const take = lead
    ? `${lead} won the ball back faster after losing it: ${fmtNum(Math.max(hRate!, aRate!), 1)}% of their losses were regained within 5 seconds.`
    : 'How quickly each team won the ball back after losing it.';
  return (
    <Stack gap={16}>
      <T v="body" color="inkSecondary">
        A transition is the few seconds after the ball changes hands. Counterpressing means trying to win it straight back.
      </T>
      <ChartFrame
        takeaway={take}
        table={{ columns: ['Window', match.home.name, match.away.name], rows: groups.map((g) => [g.label, g.home, g.away]) }}
        footer={
          <View style={{ gap: 6 }}>
            <Legend
              items={[
                { kind: 'filled', label: match.home.name, color: c.home },
                { kind: 'outlined', label: match.away.name, color: c.away },
              ]}
            />
            <T v="caption" color="muted">
              Out of {hr.turnovers ?? '—'} ({match.home.name}) and {ar.turnovers ?? '—'} ({match.away.name}) balls lost.
            </T>
          </View>
        }>
        <BarGroup groups={groups} homeName={match.home.name} awayName={match.away.name} />
      </ChartFrame>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {['transition.counterpress_regain_rate', 'transition.counterpress_regains', 'transition.counter_shots', 'transition.regain_to_shot_seconds'].map((k) => (
          <View key={k} style={{ width: '48.5%', flexGrow: 1 }}>
            <MetricTile metricKey={k} def={defs.byKey.get(k)} home={get(data, h, k)} away={get(data, a, k)} homeName={match.home.name} awayName={match.away.name} />
          </View>
        ))}
      </View>
    </Stack>
  );
}

function Loaded({ match }: { match: MatchDetail }) {
  const q = useTransitions(match.id, true);
  return (
    <QueryBoundary query={q} skeleton={<AnalysisSkeleton />} allowForced={[]}>
      {(d) => <Body match={match} data={d} />}
    </QueryBoundary>
  );
}

/** Screen 22, Transitions. Metered. */
function TransitionsView() {
  return <AnalysisScreen title="Transitions">{(m) => <Loaded match={m} />}</AnalysisScreen>;
}

// Ids from the route are validated before the screen mounts (deep links are untrusted).
export default guardParams({ matchId: 'uuid', teamId: 'uuid?' }, TransitionsView);
