import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAllEvents, useLineups, usePressing } from '@/api/hooks';
import type { MatchDetail, MetricScope, MetricValue, Pressing } from '@/api/types';
import { ChartFrame } from '@/components/ChartFrame';
import { CoverageBadge } from '@/components/badges';
import { MetricSheet, PairedBar, better } from '@/components/MetricTile';
import { QueryBoundary } from '@/components/QueryBoundary';
import { AnalysisScreen, AnalysisSkeleton, SCOPE_LABEL, useMatchParam } from '@/features/analysis/AnalysisScreen';
import { useMatchCtx } from '@/features/match/context';
import { nameIndex } from '@/features/match/events';
import { fmtNum } from '@/lib/format';
import { Legend } from '@/pitch/Legend';
import { DefensiveHeightLayer, Dot } from '@/pitch/layers';
import { PitchCanvas } from '@/pitch/PitchCanvas';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { Divider, Row, SectionHeader, Stack } from '@/ui/bits';
import { Lift } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Segmented } from '@/ui/Segmented';
import { T } from '@/ui/Text';

const ROWS: { key: string; label: string; dir: 'higher_better' | 'lower_better' | 'neutral'; unit?: string }[] = [
  { key: 'pressing.ppda', label: 'PPDA', dir: 'lower_better' },
  { key: 'pressing.ppda_incl_pressures', label: 'PPDA incl. pressures', dir: 'lower_better' },
  { key: 'pressing.pressures', label: 'Pressures', dir: 'neutral' },
  { key: 'pressing.pressure_regains_5s', label: 'Regains within 5 s of a press', dir: 'higher_better' },
  { key: 'pressing.high_turnovers', label: 'High turnovers', dir: 'higher_better' },
  { key: 'pressing.shots_after_high_turnover', label: 'Shots after high turnovers', dir: 'higher_better' },
  { key: 'pressing.defensive_action_height_m', label: 'Defensive action height', dir: 'neutral', unit: 'm' },
];

const val = (p: Pressing | undefined, teamId: string, scope: MetricScope, key: string): MetricValue | null =>
  p?.teams.find((t) => t.teamId === teamId)?.scopes[scope]?.[key] ?? null;

function sentence(teamName: string, oppName: string, ppda: number | null) {
  if (ppda === null) return `${teamName}'s pressing could not be measured.`;
  return `${teamName} let ${oppName} make about ${Math.round(ppda)} passes before trying to win the ball.`;
}

function PressingMain({ match, data }: { match: MatchDetail; data: Pressing }) {
  const { c } = useTheme();
  const { sideOf, nameOf } = useMatchCtx();
  const p = useMatchParam();
  const [teamId, setTeamId] = useState(p.teamId ?? match.home.id);
  const opp = teamId === match.home.id ? match.away.id : match.home.id;
  const side = sideOf(teamId) ?? 'home';
  const ppda = val(data, teamId, 'full', 'pressing.ppda');
  const height = val(data, teamId, 'full', 'pressing.defensive_action_height_m');
  const ht = val(data, teamId, 'full', 'pressing.high_turnovers');
  const events = useAllEvents(match.id);
  const lineups = useLineups(match.id);
  const names = useMemo(() => nameIndex(lineups.data?.lineups), [lineups.data]);
  const turnovers = useMemo(() => {
    const ids = new Set(ht?.evidence?.eventIds ?? []);
    return (events.data ?? []).filter((e) => ids.has(e.id) && e.x !== null && e.y !== null);
  }, [events.data, ht]);
  const take = sentence(nameOf(teamId), nameOf(opp), ppda?.value ?? null);
  return (
    <Stack gap={16}>
      <Segmented
        label="Team"
        value={teamId}
        onChange={setTeamId}
        options={[
          { value: match.home.id, label: match.home.name },
          { value: match.away.id, label: match.away.name },
        ]}
      />
      <Card variant="hero" glow={0.4}>
        <T v="eyebrow" tint={c.heroMuted}>
          PPDA · {nameOf(teamId)}
        </T>
        <T v="score" tint={c.lime} style={{ marginTop: 8 }}>
          {fmtNum(ppda?.value ?? null, 1)}
        </T>
        <T v="body" tint={c.heroInk} style={{ marginTop: 8 }}>
          {take}
        </T>
        <T v="caption" tint={c.heroMuted} style={{ marginTop: 8 }}>
          Lower means pressing sooner. {nameOf(opp)}: {fmtNum(val(data, opp, 'full', 'pressing.ppda')?.value ?? null, 1)}.
        </T>
      </Card>
      <ChartFrame
        takeaway={
          height?.value != null
            ? `${nameOf(teamId)} made their defensive actions ${fmtNum(height.value, 0)} m from their own goal on average, with ${ht?.value ?? 0} high turnovers.`
            : `${nameOf(teamId)}'s defensive height`
        }
        swapKey={teamId}
        table={{ columns: ['High turnover', 'Minute', 'x (m)'], rows: turnovers.map((e) => [(e.playerId && names.get(e.playerId)) || e.playerName || '—', `${e.minute}′`, fmtNum(e.x, 0)]) }}
        footer={
          <Legend
            items={[
              { kind: 'line', label: 'Average defensive action height', color: side === 'home' ? c.home : c.away },
              { kind: side === 'home' ? 'filled' : 'outlined', label: 'High turnover (ball won near their goal)', color: side === 'home' ? c.home : c.away },
            ]}
          />
        }>
        <PitchCanvas label={`Defensive action height ${fmtNum(height?.value ?? null, 0)} metres; ${turnovers.length} high turnovers marked.`} zones={['thirds']}>
          {(s) => (
            <>
              {height?.value != null ? <DefensiveHeightLayer s={s} height={height.value} side={side} label={`${fmtNum(height.value, 0)} m`} /> : null}
              {turnovers.map((e) => (
                <Dot key={e.id} s={s} x={e.x!} y={e.y!} side={side} r={6} />
              ))}
            </>
          )}
        </PitchCanvas>
      </ChartFrame>
    </Stack>
  );
}

function PressingSide({ match, data }: { match: MatchDetail; data: Pressing }) {
  const { openSheet } = useOverlay();
  const { nameOf } = useMatchCtx();
  const lineups = useLineups(match.id);
  const names = useMemo(() => nameIndex(lineups.data?.lineups), [lineups.data]);
  const halves: MetricScope[] = (['full', '1H', '2H', 'ET'] as MetricScope[]).filter((s) => data.teams.some((t) => t.scopes[s]));
  const [scope, setScope] = useState<MetricScope>('full');
  return (
    <Stack gap={16}>
      <SectionHeader title="Half by half" sub={`Left ${match.home.name}, right ${match.away.name}`} />
      <Segmented label="Period" size="sm" value={scope} onChange={setScope} options={halves.map((h) => ({ value: h, label: SCOPE_LABEL[h] }))} />
      <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        {ROWS.map((r, i) => {
          const h = val(data, match.home.id, scope, r.key);
          const a = val(data, match.away.id, scope, r.key);
          const win = better(h?.value ?? null, a?.value ?? null, r.dir);
          return (
            <View key={r.key}>
              {i > 0 ? <Divider /> : null}
              <Lift kind="none" onPress={() => openSheet(<MetricSheet metricKey={r.key} />, { title: r.label })} style={{ paddingVertical: 12, gap: 8 }} accessibilityLabel={`${r.label}: ${match.home.name} ${fmtNum(h?.value ?? null)}, ${match.away.name} ${fmtNum(a?.value ?? null)}`}>
                <Row>
                  <T v="number" style={{ width: 56, opacity: win === 'away' ? 0.6 : 1 }}>
                    {fmtNum(h?.value ?? null)}
                  </T>
                  <T v="labelSm" align="center" style={{ flex: 1 }}>
                    {r.label}
                  </T>
                  <T v="number" style={{ width: 56, textAlign: 'right', opacity: win === 'home' ? 0.6 : 1 }}>
                    {fmtNum(a?.value ?? null)}
                  </T>
                </Row>
                <PairedBar home={h?.value ?? null} away={a?.value ?? null} highlight={win} />
              </Lift>
            </View>
          );
        })}
      </Card>
      <Row gap={8}>
        <CoverageBadge label="calculated" />
        <T v="caption" color="muted" style={{ flex: 1 }}>
          Tap a row for what it means.
        </T>
      </Row>
      {data.topPressers?.length ? (
        <>
          <SectionHeader title="Who pressed most" />
          {data.topPressers.map((tp) => (
            <Card key={tp.teamId} padded={false} style={{ padding: 14 }}>
              <T v="labelSm">{nameOf(tp.teamId)}</T>
              {tp.players.slice(0, 3).map((pl) => (
                <Row key={pl.playerId} style={{ minHeight: 34 }}>
                  <T v="bodySm" style={{ flex: 1 }}>
                    {names.get(pl.playerId) ?? 'Player'}
                  </T>
                  <T v="number">{pl.pressures}</T>
                </Row>
              ))}
            </Card>
          ))}
        </>
      ) : null}
    </Stack>
  );
}

function Loaded({ match, part }: { match: MatchDetail; part: 'main' | 'side' }) {
  const q = usePressing(match.id, true);
  return (
    <QueryBoundary query={q} skeleton={part === 'main' ? <AnalysisSkeleton /> : null} allowForced={[]}>
      {(d) => (part === 'main' ? <PressingMain match={match} data={d} /> : <PressingSide match={match} data={d} />)}
    </QueryBoundary>
  );
}

/** Screen 21, Pressing. Tablet: pitch and explanation side by side. */
export default function PressingView() {
  return (
    <AnalysisScreen title="Pressing" side={(m) => <Loaded match={m} part="side" />}>
      {(m) => <Loaded match={m} part="main" />}
    </AnalysisScreen>
  );
}
