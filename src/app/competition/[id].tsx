import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useCompetition, useIsPro, useMatches, useTeams } from '@/api/hooks';
import type { Competition } from '@/api/types';
import { FollowButton } from '@/components/FollowButton';
import { MatchCard } from '@/components/MatchCard';
import { QueryBoundary } from '@/components/QueryBoundary';
import { ListRow } from '@/components/rows';
import { CardsSkeleton, EmptyState, ProOnly } from '@/components/states';
import { TeamBadge } from '@/components/TeamChip';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Lift, Rise } from '@/ui/motion';
import { Eyebrow } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { Tabs } from '@/ui/Tabs';
import { T } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

const gender = (g: string | null) => (g === 'female' ? "Women's" : g === 'male' ? "Men's" : null);

function SeasonPicker({ comp, value, onChange, lockedFrom }: { comp: Competition; value: string; onChange: (id: string) => void; lockedFrom: number | null }) {
  const { c, isDark } = useTheme();
  const [all, setAll] = useState(false);
  const selIdx = comp.seasons.findIndex((s) => s.id === value);
  const shown = all ? comp.seasons : comp.seasons.slice(0, Math.max(4, selIdx + 1));
  return (
    <View style={{ gap: 10 }}>
      {shown.map((s, i) => {
        const active = s.id === value;
        const locked = lockedFrom !== null && i >= lockedFrom;
        const cov = s.coverage;
        return (
          <Lift
            key={s.id}
            kind="none"
            onPress={() => onChange(s.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Season ${s.name}${cov ? `, ${cov.matches} matches, ${cov.withEvents} with event data, ${cov.analysed} analysed` : ''}${locked ? ', analysis needs Pro' : ''}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 58,
              paddingHorizontal: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: active ? (isDark ? c.lime : c.ink) : c.cardLine,
              backgroundColor: active ? c.limeSoft : c.surface,
            }}>
            <T v="title" num style={{ minWidth: 92 }}>
              {s.name}
            </T>
            <T v="caption" color="muted" style={{ flex: 1 }} num>
              {cov ? `${cov.matches} matches · ${cov.withEvents} with events · ${cov.analysed} analysed` : '—'}
            </T>
            {locked ? <Icon name="lock" size={18} color={c.muted} label="Analysis needs Pro" /> : null}
          </Lift>
        );
      })}
      {comp.seasons.length > shown.length ? (
        <Button label={`Show all seasons (${comp.seasons.length})`} variant="text" onPress={() => setAll(true)} />
      ) : null}
    </View>
  );
}

/** Screen 9, Competition page: header + Follow, season picker with coverage, Matches / Teams tabs. */
export default function CompetitionPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useCompetition(id);
  const { isPro } = useIsPro();
  const [picked, setSeason] = useState<string>('');
  const [tab, setTab] = useState<'matches' | 'teams'>('matches');
  const comp = q.data?.competition;
  const season = picked || comp?.seasons[0]?.id || '';
  const matches = useMatches({ competitionId: id, seasonId: season || undefined }, !!season);
  const teams = useTeams({ competitionId: id, seasonId: season || undefined }, !!season && tab === 'teams');
  const seasonIdx = comp?.seasons.findIndex((s) => s.id === season) ?? 0;
  const lockedFrom = isPro ? null : 2;
  const seasonLocked = lockedFrom !== null && seasonIdx >= lockedFrom;
  const list = useMemo(() => matches.data?.pages.flatMap((p) => p.matches) ?? [], [matches.data]);

  return (
    <Screen header={<TopBar title={comp?.name} />}>
      <QueryBoundary query={q}>
        {({ competition: c }) => (
          <Stack gap={22}>
            <Rise>
              <Eyebrow icon="public">{[c.countryName, gender(c.gender)].filter(Boolean).join(' · ') || 'Competition'}</Eyebrow>
              <T v="display" style={{ marginTop: 16 }}>
                {c.name}
              </T>
              <View style={{ marginTop: 16 }}>
                <FollowButton kind="competitions" id={c.id} name={c.name} />
              </View>
            </Rise>
            <Rise index={1}>
              <T v="titleSm" style={{ marginBottom: 10 }}>
                Season
              </T>
              <SeasonPicker comp={c} value={season} onChange={setSeason} lockedFrom={lockedFrom} />
              {seasonLocked ? (
                <View style={{ marginTop: 12 }}>
                  <ProOnly compact line={`Analysis views for ${comp?.seasons[seasonIdx]?.name} are part of Pro. Stories and timelines stay free.`} context="older_season" />
                </View>
              ) : null}
            </Rise>
            <Rise index={2}>
              <Tabs
                tabs={[
                  { value: 'matches', label: 'Matches' },
                  { value: 'teams', label: 'Teams' },
                ]}
                value={tab}
                onChange={setTab}
              />
              <View style={{ height: 16 }} />
              {tab === 'matches' ? (
                <QueryBoundary query={matches} skeleton={<CardsSkeleton count={2} />} isEmpty={() => list.length === 0} empty={<EmptyState icon="event_busy" title="No matches in this season" />}>
                  {() => (
                    <Stack gap={12}>
                      {list.slice(0, 10).map((m) => (
                        <MatchCard key={m.id} m={m} />
                      ))}
                      {list.length > 10 || matches.hasNextPage ? (
                        <Button
                          label="See all matches"
                          variant="secondary"
                          onPress={() => router.push({ pathname: '/matches', params: { competitionId: id, seasonId: season, title: c.name } })}
                        />
                      ) : null}
                    </Stack>
                  )}
                </QueryBoundary>
              ) : (
                <QueryBoundary query={teams} skeleton={<CardsSkeleton count={2} />}>
                  {(d) => (
                    <Card padded={false} style={{ paddingHorizontal: 16 }}>
                      {d.pages
                        .flatMap((p) => p.teams)
                        .map((t, i) => (
                          <View key={t.id}>
                            {i > 0 ? <Divider inset={54} /> : null}
                            <ListRow
                              leading={<TeamBadge name={t.name} side="home" size={38} />}
                              title={t.name}
                              sub={t.isNationalTeam ? 'National team' : t.countryName}
                              onPress={() => router.push(`/team/${t.id}`)}
                            />
                          </View>
                        ))}
                    </Card>
                  )}
                </QueryBoundary>
              )}
            </Rise>
          </Stack>
        )}
      </QueryBoundary>
    </Screen>
  );
}
