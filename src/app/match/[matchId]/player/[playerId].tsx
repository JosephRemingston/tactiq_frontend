import { guardParams } from '@/components/ParamGuard';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useMetricDefinitions, usePlayerInMatch, useShape } from '@/api/hooks';
import type { MatchDetail, PlayerInMatch } from '@/api/types';
import { featureLabel, Radar } from '@/charts/charts';
import { ChartFrame } from '@/components/ChartFrame';
import { CoverageBadge } from '@/components/badges';
import { MetricSheet, withUnit } from '@/components/MetricTile';
import { QueryBoundary } from '@/components/QueryBoundary';
import { StateBlock } from '@/components/states';
import { AnalysisScreen, AnalysisSkeleton } from '@/features/analysis/AnalysisScreen';
import { useMatchCtx } from '@/features/match/context';
import { fmtNum } from '@/lib/format';
import { NetworkLayer } from '@/pitch/layers';
import { PitchCanvas } from '@/pitch/PitchCanvas';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Row, SectionHeader, Stack } from '@/ui/bits';
import { Lift } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { T } from '@/ui/Text';

function RoleCard({ p }: { p: PlayerInMatch['player'] }) {
  const { c } = useTheme();
  const r = p.role;
  if (!r)
    return (
      <StateBlock
        icon="timer"
        title="Not enough minutes to profile a role"
        body={`${p.name} played ${p.minutes} minutes. We need at least 30 to say how they played.`}
      />
    );
  return (
    <Card variant="hero" glow={0.35}>
      <Row gap={8}>
        <T v="eyebrow" tint={c.heroMuted} style={{ flex: 1 }}>
          Role in this match
        </T>
        <CoverageBadge label="inferred" />
      </Row>
      <T v="headline" tint={c.heroInk} style={{ marginTop: 10 }}>
        {r.roleLabel}
      </T>
      {r.secondRoleLabel ? (
        <T v="body" tint={c.heroMuted} style={{ marginTop: 4 }}>
          Second closest: {r.secondRoleLabel}
        </T>
      ) : null}
      <T v="bodySm" tint={c.heroInkSecondary} style={{ marginTop: 12 }}>
        This is an interpretation from {p.name}'s actions, compared with typical players in each role. It stood out most for {r.topFeatures.map(featureLabel).join(', ').toLowerCase()}.
      </T>
    </Card>
  );
}

function Body({ match, playerId }: { match: MatchDetail; playerId: string }) {
  const { c } = useTheme();
  const { sideOf, nameOf } = useMatchCtx();
  const { openSheet } = useOverlay();
  const defs = useMetricDefinitions();
  const q = usePlayerInMatch(match.id, playerId, true);
  const shape = useShape(match.id, 'full', true);
  return (
    <QueryBoundary query={q} skeleton={<AnalysisSkeleton />} allowForced={[]}>
      {(p) => {
        const side = sideOf(p.teamId) ?? 'home';
        const team = shape.data?.teams.find((t) => t.teamId === p.teamId);
        const zKeys = p.role ? Object.keys(p.role.z).sort((a, b) => Math.abs(p.role!.z[b]) - Math.abs(p.role!.z[a])).slice(0, 8) : [];
        const metrics = p.metrics.filter((m) => m.scope === 'full' && m.value !== null);
        const node = team?.passingNetwork.nodes.find((n) => n.playerId === p.playerId);
        return (
          <Stack gap={20}>
            <View>
              <T v="display">{p.name}</T>
              <Row gap={8} wrap style={{ marginTop: 8 }}>
                <Tag size="sm" tone={side}>
                  {nameOf(p.teamId)}
                </Tag>
                {p.positionName ? <Tag size="sm">{p.positionName}</Tag> : null}
                <Tag size="sm" icon="timer">{`${p.minutes} min`}</Tag>
                <Tag size="sm">{p.isStarter ? 'Started' : 'Sub'}</Tag>
              </Row>
            </View>
            <RoleCard p={p} />
            {p.role ? (
              <ChartFrame
                takeaway={`How ${p.name}'s output compares with the reference group (per 90 minutes).`}
                table={{
                  columns: ['Feature', 'Per 90', 'vs typical'],
                  rows: zKeys.map((k) => [featureLabel(k), fmtNum(p.role!.features[k] ?? null), `${(p.role!.z[k] ?? 0) >= 0 ? '+' : ''}${(p.role!.z[k] ?? 0).toFixed(1)}`]),
                }}>
                <Radar z={p.role.z} keys={zKeys} />
              </ChartFrame>
            ) : null}
            {team ? (
              <ChartFrame
                takeaway={node ? `${p.name} averaged this position, with ${node.passes} passes and ${node.receptions} received.` : `${p.name} isn't in the passing network (too few passes).`}>
                <PitchCanvas label={`Passing network of ${nameOf(p.teamId)} with ${p.name} highlighted.`} zones={['thirds']}>
                  {(s) => <NetworkLayer s={s} nodes={team.passingNetwork.nodes} edges={team.passingNetwork.edges} side={side} selected={p.playerId} />}
                </PitchCanvas>
              </ChartFrame>
            ) : null}
            {metrics.length ? (
              <View>
                <SectionHeader title="Their numbers" />
                <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 12 }}>
                  {metrics.map((m, i) => {
                    const d = defs.byKey.get(m.key);
                    return (
                      <View key={m.key}>
                        {i > 0 ? <Divider /> : null}
                        <Lift kind="none" onPress={() => openSheet(<MetricSheet metricKey={m.key} />, { title: d?.name ?? m.key })} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center' }}>
                          <T v="bodySm" style={{ flex: 1 }}>
                            {d?.name ?? m.key}
                          </T>
                          <T v="number">{withUnit(m.value, d?.unit)}</T>
                        </Lift>
                      </View>
                    );
                  })}
                </Card>
              </View>
            ) : null}
            <Button label="Player profile" variant="secondary" onPress={() => router.push(`/player/${p.playerId}`)} />
            <T v="caption" color="muted">
              {p.role?.reference?.provisional ? 'The reference group is provisional. ' : ''}Roles come from on-ball events only; off-ball movement isn't measured.
            </T>
            <View style={{ height: 1, backgroundColor: c.line }} />
          </Stack>
        );
      }}
    </QueryBoundary>
  );
}

/** Screen 25, Player in match: role (inferred), radar, metrics, highlighted on the network. Metered. */
function PlayerInMatchView() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  return <AnalysisScreen title="Player in match">{(m) => <Body match={m} playerId={playerId} />}</AnalysisScreen>;
}

// Ids from the route are validated before the screen mounts (deep links are untrusted).
export default guardParams({ matchId: 'uuid', playerId: 'uuid' }, PlayerInMatchView);
