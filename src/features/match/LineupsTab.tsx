import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useLineups } from '@/api/hooks';
import type { LineupPlayer } from '@/api/types';
import { DataSourceFooter } from '@/components/DataSourceFooter';
import { QueryBoundary } from '@/components/QueryBoundary';
import { PlayerRow } from '@/components/rows';
import { CardsSkeleton, EmptyState } from '@/components/states';
import { displayName } from '@/lib/format';
import { PitchCanvas } from '@/pitch/PitchCanvas';
import { Dot } from '@/pitch/layers';
import { Card } from '@/ui/Card';
import { Divider, Row, Stack } from '@/ui/bits';
import { Segmented } from '@/ui/Segmented';
import { T } from '@/ui/Text';
import { useMatchCtx } from './context';
import { spotFor } from './positions';

function List({ title, players, fullTime, onOpen }: { title: string; players: LineupPlayer[]; fullTime: number; onOpen: (p: LineupPlayer) => void }) {
  if (!players.length) return null;
  return (
    <View>
      <T v="eyebrow" color="muted" style={{ marginBottom: 6 }}>
        {title} · {players.length}
      </T>
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        {players.map((p, i) => (
          <View key={p.playerId}>
            {i > 0 ? <Divider inset={48} /> : null}
            <PlayerRow p={p} fullTime={fullTime} onPress={() => onOpen(p)} />
          </View>
        ))}
      </Card>
    </View>
  );
}

/** Screen 18, Lineups: formation diagram per team, starters and substitutes. Toggle home / away. */
export function LineupsTab() {
  const { match, sideOf, analysable } = useMatchCtx();
  const q = useLineups(match.id, match.coverage.hasLineups);
  const [teamId, setTeamId] = useState(match.home.id);
  const open = (p: LineupPlayer) =>
    analysable
      ? router.push({ pathname: '/match/[matchId]/player/[playerId]', params: { matchId: match.id, playerId: p.playerId } })
      : router.push(`/player/${p.playerId}`);
  if (!match.coverage.hasLineups) return <EmptyState icon="groups" title="No lineups for this match" body="We only have the score for this match." />;
  return (
    <Stack gap={18}>
      <Segmented
        label="Team"
        value={teamId}
        onChange={setTeamId}
        options={[
          { value: match.home.id, label: match.home.name },
          { value: match.away.id, label: match.away.name },
        ]}
      />
      <QueryBoundary query={q} skeleton={<CardsSkeleton count={2} pitch />}>
        {({ lineups }) => {
          const l = lineups.find((x) => x.teamId === teamId) ?? lineups[0];
          if (!l) return <EmptyState icon="groups" title="No lineup" />;
          const side = sideOf(l.teamId) ?? 'home';
          const formation = side === 'home' ? match.home.formation : match.away.formation;
          const fullTime = Math.max(90, ...[...l.starters, ...l.substitutes].map((p) => p.minuteOff ?? 0));
          return (
            <Stack gap={18}>
              <View>
                <Row style={{ marginBottom: 10 }}>
                  <T v="titleSm" style={{ flex: 1 }}>
                    Starting formation
                  </T>
                  {formation ? (
                    <T v="number" color="muted">
                      {formation}
                    </T>
                  ) : null}
                </Row>
                <PitchCanvas
                  label={`${l.teamName} starting ${formation ?? 'lineup'}: ${l.starters.map((p) => `${p.jerseyNumber} ${displayName(p)} ${p.positionName ?? ''}`).join(', ')}`}
                  zones={['thirds']}>
                  {(s) =>
                    l.starters.map((p, i) => {
                      const spot = spotFor(p.positionName, i);
                      return <Dot key={p.playerId} s={s} x={spot.x} y={spot.y} side={side} r={11} label={String(p.jerseyNumber ?? '')} onPress={() => open(p)} />;
                    })
                  }
                </PitchCanvas>
                <T v="caption" color="muted" style={{ marginTop: 8 }}>
                  Nominal positions from the team sheet. For where players actually stood, open Analysis → Shape.
                </T>
              </View>
              <List title="Starters" players={l.starters} fullTime={fullTime} onOpen={open} />
              <List title="Substitutes" players={l.substitutes} fullTime={fullTime} onOpen={open} />
            </Stack>
          );
        }}
      </QueryBoundary>
      <DataSourceFooter match={match} />
    </Stack>
  );
}
