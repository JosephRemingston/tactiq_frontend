import { guardParams } from '@/components/ParamGuard';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { usePlayer, usePlayerMatches } from '@/api/hooks';
import { FollowButton } from '@/components/FollowButton';
import { QueryBoundary } from '@/components/QueryBoundary';
import { ListRow } from '@/components/rows';
import { CardsSkeleton, EmptyState } from '@/components/states';
import { AnalysisBadge } from '@/components/badges';
import { TeamBadge } from '@/components/TeamChip';
import { fmtDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Row, Stack } from '@/ui/bits';
import { Rise } from '@/ui/motion';
import { Eyebrow } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

const GROUP: Record<string, string> = { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' };

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={{ flex: 1 }}>
      <T v="numberLg">{value}</T>
      <T v="caption" color="muted">
        {label}
      </T>
    </View>
  );
}

/** Screen 13, Player profile. Tapping an analysed match opens Player in match (metered). */
function PlayerPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const q = usePlayer(id);
  const matches = usePlayerMatches(id);
  const list = useMemo(() => matches.data?.pages.flatMap((p) => p.matches) ?? [], [matches.data]);

  return (
    <Screen header={<TopBar title={q.data?.player.knownName ?? q.data?.player.name} />}>
      <QueryBoundary query={q}>
        {({ player: p }) => (
          <Stack gap={22}>
            <Rise>
              <Eyebrow icon="person">{[p.countryName, p.positionName ?? (p.positionGroup ? GROUP[p.positionGroup] : null)].filter(Boolean).join(' · ') || 'Player'}</Eyebrow>
              <T v="display" style={{ marginTop: 16 }}>
                {p.knownName ?? p.name}
              </T>
              {p.knownName && p.knownName !== p.name ? (
                <T v="body" color="muted" style={{ marginTop: 4 }}>
                  {p.name}
                </T>
              ) : null}
              <View style={{ marginTop: 16 }}>
                <FollowButton kind="players" id={p.id} name={p.knownName ?? p.name} />
              </View>
            </Rise>
            <Rise index={1}>
              <Card>
                <Row gap={16}>
                  <Stat label="Appearances" value={p.appearances} />
                  <Stat label="Starts" value={p.starts} />
                  <Stat label="Teams" value={new Set(p.teams.map((t) => t.teamId)).size} />
                </Row>
              </Card>
            </Rise>
            <Rise index={2}>
              <T v="titleSm" style={{ marginBottom: 10 }}>
                Teams and seasons
              </T>
              <Card padded={false} style={{ paddingHorizontal: 16 }}>
                {p.teams.map((t, i) => (
                  <View key={`${t.teamId}:${t.seasonId}`}>
                    {i > 0 ? <Divider inset={54} /> : null}
                    <ListRow
                      leading={<TeamBadge name={t.teamName} side="home" size={38} />}
                      title={t.teamName}
                      sub={`${t.seasonName}${t.jerseyNumber !== null ? ` · Shirt ${t.jerseyNumber}` : ''}`}
                      onPress={() => router.push(`/team/${t.teamId}`)}
                    />
                  </View>
                ))}
              </Card>
            </Rise>
            <Rise index={3}>
              <T v="titleSm" style={{ marginBottom: 10 }}>
                Matches
              </T>
              <QueryBoundary query={matches} skeleton={<CardsSkeleton count={2} />} isEmpty={() => !list.length} empty={<EmptyState icon="event_busy" title="No matches yet" />}>
                {() => (
                  <Card padded={false} style={{ paddingHorizontal: 16 }}>
                    {list.map((m, i) => {
                      const analysed = m.analysisStatus === 'complete';
                      return (
                        <View key={m.id}>
                          {i > 0 ? <Divider /> : null}
                          <ListRow
                            title={`${m.home.name} ${m.home.score ?? ''}–${m.away.score ?? ''} ${m.away.name}`}
                            sub={`${m.competition.name}${m.stage ? ` · ${m.stage}` : ''} · ${fmtDate(m.kickoffAt)}`}
                            trailing={<AnalysisBadge status={m.analysisStatus} level={m.coverage.level} />}
                            accessibilityLabel={`${m.home.name} ${m.home.score} ${m.away.name} ${m.away.score}. ${analysed ? 'Opens this player in the match' : 'Opens the match'}`}
                            onPress={() =>
                              analysed
                                ? router.push({ pathname: '/match/[matchId]/player/[playerId]', params: { matchId: m.id, playerId: p.id } })
                                : router.push(`/match/${m.id}`)
                            }
                          />
                        </View>
                      );
                    })}
                    {matches.hasNextPage ? (
                      <View style={{ paddingVertical: 12 }}>
                        {matches.isFetchingNextPage ? <ActivityIndicator color={c.ink} /> : <Button label="Load more" variant="text" onPress={() => matches.fetchNextPage()} />}
                      </View>
                    ) : null}
                  </Card>
                )}
              </QueryBoundary>
            </Rise>
          </Stack>
        )}
      </QueryBoundary>
    </Screen>
  );
}

// Ids from the route are validated before the screen mounts (deep links are untrusted).
export default guardParams({ id: 'uuid' }, PlayerPage);
