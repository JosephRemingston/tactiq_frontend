import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useMetricDefinitions, useTeam, useTeamCoverage, useTeamPlayers, useTeamStyle } from '@/api/hooks';
import type { TeamCoverage, TeamStyle } from '@/api/types';
import { FollowButton } from '@/components/FollowButton';
import { MatchCard } from '@/components/MatchCard';
import { QueryBoundary } from '@/components/QueryBoundary';
import { SquadGroups } from '@/components/Squad';
import { CardsSkeleton, EmptyState } from '@/components/states';
import { TeamBadge } from '@/components/TeamChip';
import { fmtNum } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Banner } from '@/ui/Banner';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Row, Stack } from '@/ui/bits';
import { Rise } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { Tabs } from '@/ui/Tabs';
import { T } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

type Tab = 'overview' | 'squad' | 'style' | 'seasons';
function coverageLine(cov: TeamCoverage | undefined) {
  if (!cov) return null;
  const t = cov.seasons.reduce(
    (a, s) => ({ fixtures: a.fixtures + s.matches.fixtures, events: a.events + s.matches.events, ff: a.ff + s.matches.freezeFrames, an: a.an + s.matches.analysed }),
    { fixtures: 0, events: 0, ff: 0, an: 0 },
  );
  return `${t.fixtures} fixtures · ${t.events} with events · ${t.ff} with freeze frames · ${t.an} analysed`;
}

function StyleTab({ style }: { style: TeamStyle }) {
  const { c } = useTheme();
  const defs = useMetricDefinitions();
  const { openSheet } = useOverlay();
  if (!style.data.length) return <EmptyState icon="strategy" title="No style yet" body="Style appears once this team has analysed matches." />;
  return (
    <Stack gap={18}>
      {style.data.map((d) => {
        const labels = d.labels.map((l) => (typeof l === 'string' ? l : l.label));
        return (
          <Stack key={d.seasonId} gap={12}>
            <Row>
              <T v="titleSm" style={{ flex: 1 }}>
                Style
              </T>
              <Tag size="sm" icon="query_stats">
                {`${d.matchesAnalysed} analysed`}
              </Tag>
            </Row>
            {labels.length ? (
              <Row wrap gap={8}>
                {labels.map((l) => (
                  <Tag key={l} tone="lime">
                    {l}
                  </Tag>
                ))}
              </Row>
            ) : (
              <Banner tone="info" title="Not enough matches yet">
                {d.note ?? 'Style labels need at least 5 analysed matches.'}
              </Banner>
            )}
            <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
              <Row style={{ paddingVertical: 10 }}>
                <T v="caption" color="muted" style={{ flex: 1 }}>
                  Metric
                </T>
                <T v="caption" color="muted" style={{ width: 64, textAlign: 'right' }}>
                  Median
                </T>
                <T v="caption" color="muted" style={{ width: 96, textAlign: 'right' }}>
                  Range
                </T>
              </Row>
              {Object.entries(d.metrics).map(([key, m]) => {
                const def = defs.byKey.get(key);
                return (
                  <View key={key}>
                    <Divider />
                    <Row style={{ minHeight: 48 }}>
                      <T
                        v="bodySm"
                        style={{ flex: 1 }}
                        onPress={() => router.push(`/metric/${key}`)}
                        accessibilityRole="link"
                        accessibilityHint="Opens the metric definition">
                        {def?.name ?? key}
                      </T>
                      <T v="number" style={{ width: 64, textAlign: 'right' }}>
                        {fmtNum(m.median)}
                      </T>
                      <T v="caption" color="muted" style={{ width: 96, textAlign: 'right' }} num>
                        {m.p25 !== null && m.p75 !== null ? (m.p25 === m.p75 ? `n=${m.n}` : `${fmtNum(m.p25)}–${fmtNum(m.p75)}`) : '—'}
                      </T>
                    </Row>
                  </View>
                );
              })}
            </Card>
            <Row>
              <T v="caption" color="muted" style={{ flex: 1 }}>
                Range is the middle half of this team's matches (25th–75th percentile).
              </T>
              <IconButton
                icon="info"
                label="About style"
                size={20}
                color={c.muted}
                onPress={() =>
                  openSheet(
                    <T v="body" color="inkSecondary">
                      Style labels such as “presses high” come from this team's analysed matches compared with the rest of the competition. With only a few matches the labels would be guesses, so we wait for at least five.
                    </T>,
                    { title: 'About team style' },
                  )
                }
              />
            </Row>
          </Stack>
        );
      })}
    </Stack>
  );
}

/** Screen 11, Club page: header + Follow + data available; Overview, Squad, Style, Seasons. */
export default function TeamPage() {
  const { id, tab: initial } = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(initial ?? 'overview');
  const q = useTeam(id);
  const cov = useTeamCoverage(id);
  const squad = useTeamPlayers(id);
  const style = useTeamStyle(id);
  const covLine = useMemo(() => coverageLine(cov.data), [cov.data]);

  return (
    <Screen header={<TopBar title={q.data?.team.name} />}>
      <QueryBoundary query={q}>
        {({ team }) => (
          <Stack gap={22}>
            <Rise>
              <Row gap={14}>
                <TeamBadge name={team.name} side="home" size={56} />
                <View style={{ flex: 1 }}>
                  <T v="display">{team.name}</T>
                  <Row gap={8} style={{ marginTop: 6 }} wrap>
                    {team.isNationalTeam ? <Tag size="sm" icon="flag">National team</Tag> : null}
                    {team.countryName && !team.isNationalTeam ? <Tag size="sm">{team.countryName}</Tag> : null}
                  </Row>
                </View>
              </Row>
              <View style={{ marginTop: 16 }}>
                <FollowButton kind="teams" id={team.id} name={team.name} />
              </View>
              {covLine ? (
                <Card variant="tint" style={{ marginTop: 16, padding: 14 }} padded={false}>
                  <T v="eyebrow" color="muted">
                    Data available
                  </T>
                  <T v="bodySm" color="inkSecondary" style={{ marginTop: 4 }} num>
                    {covLine}
                  </T>
                </Card>
              ) : null}
            </Rise>
            <Tabs
              tabs={[
                { value: 'overview', label: 'Overview' },
                { value: 'squad', label: 'Squad' },
                { value: 'style', label: 'Style' },
                { value: 'seasons', label: 'Seasons' },
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === 'overview' ? (
              team.recentMatches.length ? (
                <Stack gap={12}>
                  <T v="titleSm">Recent matches</T>
                  {team.recentMatches.map((m) => (
                    <MatchCard key={m.id} m={m} />
                  ))}
                  <Button label="All matches" variant="secondary" onPress={() => router.push({ pathname: '/matches', params: { teamId: team.id, title: team.name } })} />
                </Stack>
              ) : (
                <EmptyState icon="event_busy" title="No matches yet" />
              )
            ) : tab === 'squad' ? (
              <QueryBoundary query={squad} skeleton={<CardsSkeleton count={2} />} isEmpty={(d) => !d.players.length} empty={<EmptyState icon="group" title="No squad data" />}>
                {(d) => (
                  <Stack gap={14}>
                    <SquadGroups players={d.players} limit={4} />
                    <Button label={`Full squad (${d.players.length})`} variant="secondary" onPress={() => router.push(`/team/${team.id}/squad`)} />
                  </Stack>
                )}
              </QueryBoundary>
            ) : tab === 'style' ? (
              <QueryBoundary query={style} skeleton={<CardsSkeleton count={2} />}>
                {(d) => <StyleTab style={d.style} />}
              </QueryBoundary>
            ) : (
              <QueryBoundary query={cov} skeleton={<CardsSkeleton count={2} />} isEmpty={(d) => !d.seasons.length}>
                {(d) => (
                  <Stack gap={12}>
                    {d.seasons.map((s) => (
                      <Card key={s.seasonId}>
                        <T v="eyebrow" color="muted">
                          {s.competitionName}
                        </T>
                        <T v="title" style={{ marginTop: 6 }}>
                          {s.seasonName}
                        </T>
                        <Row wrap gap={8} style={{ marginTop: 12 }}>
                          <Tag size="sm">{`${s.matches.fixtures} fixtures`}</Tag>
                          <Tag size="sm">{`${s.matches.events} with events`}</Tag>
                          <Tag size="sm">{`${s.matches.freezeFrames} freeze frames`}</Tag>
                          <Tag size="sm" tone={s.matches.analysed ? 'lime' : 'neutral'}>{`${s.matches.analysed} analysed`}</Tag>
                        </Row>
                        <T v="caption" color="muted" style={{ marginTop: 10 }}>
                          No tracking or video data for this season.
                        </T>
                        <Button
                          label="Matches this season"
                          variant="text"
                          full={false}
                          compact
                          onPress={() => router.push({ pathname: '/matches', params: { teamId: team.id, seasonId: s.seasonId, title: `${team.name} · ${s.seasonName}` } })}
                        />
                      </Card>
                    ))}
                  </Stack>
                )}
              </QueryBoundary>
            )}
          </Stack>
        )}
      </QueryBoundary>
    </Screen>
  );
}
