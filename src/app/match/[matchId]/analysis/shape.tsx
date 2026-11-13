import { guardParams } from '@/components/ParamGuard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useLineups, useShape } from '@/api/hooks';
import type { FormationEvent, MatchDetail, ShapeTeam } from '@/api/types';
import { ChartFrame } from '@/components/ChartFrame';
import { CoverageBadge } from '@/components/badges';
import { QueryBoundary } from '@/components/QueryBoundary';
import { AnalysisScreen, AnalysisSkeleton, useMatchParam } from '@/features/analysis/AnalysisScreen';
import { useMatchCtx } from '@/features/match/context';
import { Legend } from '@/pitch/Legend';
import { NetworkLayer } from '@/pitch/layers';
import { PitchCanvas } from '@/pitch/PitchCanvas';
import { useTheme } from '@/theme/ThemeProvider';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Row, SectionHeader, Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Segmented } from '@/ui/Segmented';
import { T } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';

type View3 = { scope: 'full' | '1H' | '2H'; teamId: string; startXI: boolean; selected: string | null };

function useNetwork(team: ShapeTeam | undefined, startXI: boolean) {
  return useMemo(() => {
    if (!team) return { nodes: [], edges: [], minute: null as number | null };
    const u = team.passingNetwork.untilFirstSub;
    if (startXI && u) return { nodes: u.nodes, edges: u.edges, minute: u.minute };
    return { nodes: team.passingNetwork.nodes, edges: team.passingNetwork.edges, minute: null };
  }, [team, startXI]);
}

function takeawayFor(teamName: string, nodes: { name: string; passes: number; playerId: string }[], edges: { from: string; to: string; count: number }[]) {
  if (!nodes.length) return `${teamName} has no passing network for this period.`;
  const hub = [...nodes].sort((a, b) => b.passes - a.passes)[0];
  const top = [...edges].sort((a, b) => b.count - a.count)[0];
  const name = (id: string) => nodes.find((n) => n.playerId === id)?.name ?? '';
  return top
    ? `${hub.name} was ${teamName}'s hub with ${hub.passes} passes; the busiest link was ${name(top.from)} to ${name(top.to)} (${top.count}).`
    : `${hub.name} was ${teamName}'s hub with ${hub.passes} passes.`;
}

function Timeline({ items }: { items: FormationEvent[] }) {
  const { c } = useTheme();
  return (
    <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
      {items.map((f, i) => (
        <View key={`${f.eventId}:${i}`}>
          {i > 0 ? <Divider inset={56} /> : null}
          <Row gap={12} style={{ minHeight: 48, paddingVertical: 6 }}>
            <T v="number" style={{ width: 40, textAlign: 'right' }}>
              {f.minute}′
            </T>
            <Icon name={f.kind === 'substitution' ? 'swap_vert' : 'grid_view'} size={18} color={f.kind === 'substitution' ? c.muted : c.ink} />
            <T v="bodySm" style={{ flex: 1 }}>
              {f.kind === 'substitution'
                ? `${f.playerOn} on for ${f.playerOff}${f.reason && f.reason !== 'tactical' ? ` (${f.reason})` : ''}`
                : f.kind === 'starting_formation'
                  ? `Started in a ${f.formation}`
                  : `Switched to a ${f.formation}`}
            </T>
          </Row>
        </View>
      ))}
    </Card>
  );
}

function ShapeMain({ match, v, set }: { match: MatchDetail; v: View3; set: (p: Partial<View3>) => void }) {
  const { sideOf, nameOf } = useMatchCtx();
  const { c } = useTheme();
  const q = useShape(match.id, v.scope, true);
  const lineups = useLineups(match.id);
  const jersey = useMemo(() => {
    const m = new Map<string, number | null>();
    lineups.data?.lineups.forEach((l) => [...l.starters, ...l.substitutes].forEach((p) => m.set(p.playerId, p.jerseyNumber)));
    return m;
  }, [lineups.data]);
  const team = q.data?.teams.find((t) => t.teamId === v.teamId);
  const net = useNetwork(team, v.startXI && v.scope === 'full');
  const side = sideOf(v.teamId) ?? 'home';
  const teamName = nameOf(v.teamId);
  const sel = net.nodes.find((n) => n.playerId === v.selected);
  const selLinks = sel ? net.edges.filter((e) => e.from === sel.playerId || e.to === sel.playerId).sort((a, b) => b.count - a.count).slice(0, 3) : [];
  const nameOfNode = (id: string) => net.nodes.find((n) => n.playerId === id)?.name ?? '';

  return (
    <Stack gap={16}>
      <Segmented
        label="Team"
        value={v.teamId}
        onChange={(teamId) => set({ teamId, selected: null })}
        options={[
          { value: match.home.id, label: match.home.name },
          { value: match.away.id, label: match.away.name },
        ]}
      />
      <Segmented
        label="Period"
        size="sm"
        value={v.scope}
        onChange={(scope) => set({ scope, selected: null })}
        options={[
          { value: 'full', label: 'Full match' },
          { value: '1H', label: '1st half' },
          { value: '2H', label: '2nd half' },
        ]}
      />
      {v.scope === 'full' ? (
        <Toggle value={v.startXI} onChange={(startXI) => set({ startXI, selected: null })} left="Full match" right="Starting XI" label="Starting XI until first sub, or full match" />
      ) : null}
      <QueryBoundary query={q} skeleton={<AnalysisSkeleton />} allowForced={[]}>
        {() => (
          <Stack gap={14}>
            <ChartFrame
              takeaway={takeawayFor(teamName, net.nodes, net.edges)}
              swapKey={`${v.teamId}:${v.scope}:${v.startXI}`}
              table={{
                columns: ['Player', 'Passes', 'Received'],
                rows: [...net.nodes].sort((a, b) => b.passes - a.passes).map((n) => [n.name, n.passes, n.receptions]),
              }}
              footer={
                <Stack gap={10}>
                  <Legend
                    items={[
                      { kind: side === 'home' ? 'filled' : 'outlined', label: 'Player at average position (size = passes)', color: side === 'home' ? c.home : c.away },
                      { kind: 'line', label: 'Passes between two players (thicker = more)', color: side === 'home' ? c.home : c.away },
                    ]}
                  />
                  <Row gap={8} wrap>
                    <CoverageBadge label="calculated" />
                    <T v="caption" color="muted">
                      {net.minute ? `Until the first substitution (${net.minute}′). ` : ''}Links with fewer than 3 passes are hidden.
                    </T>
                  </Row>
                </Stack>
              }>
              <PitchCanvas label={takeawayFor(teamName, net.nodes, net.edges)} zones={['thirds']}>
                {(s) => <NetworkLayer s={s} nodes={net.nodes} edges={net.edges} side={side} selected={v.selected} onSelect={(id) => set({ selected: v.selected === id ? null : id })} jersey={jersey} />}
              </PitchCanvas>
            </ChartFrame>
            {sel ? (
              <Card>
                <Row>
                  <T v="titleSm" style={{ flex: 1 }}>
                    {sel.name}
                  </T>
                  <T v="caption" color="muted">
                    {sel.positionName}
                  </T>
                </Row>
                <Row gap={24} style={{ marginTop: 10 }}>
                  <View>
                    <T v="numberLg">{sel.passes}</T>
                    <T v="caption" color="muted">
                      Passes
                    </T>
                  </View>
                  <View>
                    <T v="numberLg">{sel.receptions}</T>
                    <T v="caption" color="muted">
                      Received
                    </T>
                  </View>
                </Row>
                {selLinks.length ? (
                  <T v="bodySm" color="inkSecondary" style={{ marginTop: 10 }}>
                    Most connected with {selLinks.map((e) => `${nameOfNode(e.from === sel.playerId ? e.to : e.from)} (${e.count})`).join(', ')}.
                  </T>
                ) : null}
                <Button
                  label="Player in this match"
                  variant="text"
                  full={false}
                  compact
                  onPress={() => router.push({ pathname: '/match/[matchId]/player/[playerId]', params: { matchId: match.id, playerId: sel.playerId } })}
                />
              </Card>
            ) : (
              <T v="caption" color="muted">
                Tap a player to see their passes and receptions.
              </T>
            )}
            {q.data?.note ? <Banner tone="info">{q.data.note}</Banner> : null}
          </Stack>
        )}
      </QueryBoundary>
    </Stack>
  );
}

function ShapeSide({ match, teamId, scope }: { match: MatchDetail; teamId: string; scope: 'full' | '1H' | '2H' }) {
  const q = useShape(match.id, scope, true);
  const team = q.data?.teams.find((t) => t.teamId === teamId);
  const unavailable = q.data?.unavailable?.[0];
  if (!team) return null;
  return (
    <Stack gap={14}>
      <SectionHeader title="Formation timeline" sub={team.startingFormation ? `Started in a ${team.startingFormation}` : undefined} />
      <Timeline items={team.formationTimeline} />
      {unavailable ? <Banner tone="info" title="Not shown">{unavailable.reason}</Banner> : null}
    </Stack>
  );
}

/** Screen 20, Shape and passing network. Tablet: pitch and explanation side by side. */
function ShapeView() {
  const p = useMatchParam();
  const [v, setV] = useState<View3 | null>(null);
  return (
    <AnalysisScreen
      title="Shape"
      side={(match) => {
        const cur = v ?? { scope: 'full', teamId: p.teamId ?? match.home.id, startXI: true, selected: null };
        return <ShapeSide match={match} teamId={cur.teamId} scope={cur.scope} />;
      }}>
      {(match) => {
        const cur: View3 = v ?? { scope: p.scope === '1H' || p.scope === '2H' ? p.scope : 'full', teamId: p.teamId ?? match.home.id, startXI: true, selected: null };
        return <ShapeMain match={match} v={cur} set={(patch) => setV({ ...cur, ...patch })} />;
      }}
    </AnalysisScreen>
  );
}

// Ids from the route are validated before the screen mounts (deep links are untrusted).
export default guardParams({ matchId: 'uuid', teamId: 'uuid?' }, ShapeView);
