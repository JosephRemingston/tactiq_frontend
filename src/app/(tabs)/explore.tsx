import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useCompetitions, useConcepts, useMatches } from '@/api/hooks';
import type { Competition } from '@/api/types';
import { ConceptCard } from '@/components/ConceptCard';
import { MatchCard } from '@/components/MatchCard';
import { QueryBoundary } from '@/components/QueryBoundary';
import { CardsSkeleton } from '@/components/states';
import { IconTile, ListRow } from '@/components/rows';
import { SponsoredCard, useInterleaved } from '@/services/ads';
import { useSignedIn } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { Divider, SectionHeader, Skeleton, Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Lift, Rise } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { AvatarButton } from '@/components/Avatar';

const gender = (g: string | null) => (g === 'female' ? "Women's" : g === 'male' ? "Men's" : null);

function SearchEntry() {
  const { c } = useTheme();
  return (
    <Lift
      kind="none"
      onPress={() => router.push('/search')}
      accessibilityRole="search"
      accessibilityLabel="Search teams, players, competitions and concepts"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 14, paddingHorizontal: 16, backgroundColor: c.surfaceLow, borderWidth: 1, borderColor: c.line }}>
      <Icon name="search" size={22} color={c.muted} />
      <T v="body" color="muted">
        Teams, players, competitions, concepts
      </T>
    </Lift>
  );
}

function CompetitionList({ comps }: { comps: Competition[] }) {
  const sorted = useMemo(
    () => [...comps].sort((a, b) => (a.name === 'FIFA World Cup' ? -1 : b.name === 'FIFA World Cup' ? 1 : a.name.localeCompare(b.name))),
    [comps],
  );
  const { rows, ads } = useInterleaved(sorted, 'explore');
  return (
    <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
      {rows.map((r, i) =>
        r.kind === 'item' ? (
          <View key={r.item.id}>
            {i > 0 ? <Divider inset={54} /> : null}
            <ListRow
              leading={<IconTile icon="trophy" tone={r.item.name === 'FIFA World Cup' ? 'lime' : 'neutral'} />}
              title={r.item.name}
              sub={[r.item.countryName, gender(r.item.gender), `${r.item.seasons.length} ${r.item.seasons.length === 1 ? 'season' : 'seasons'}`].filter(Boolean).join(' · ')}
              onPress={() => router.push(`/competition/${r.item.id}`)}
            />
          </View>
        ) : ads.native && ads.cfg ? (
          <View key={`ad${r.slot}`} style={{ marginVertical: 8 }}>
            <SponsoredCard id={`explore:${r.slot}`} placement={ads.native.placement.key} cfg={ads.cfg} max={ads.native.max} />
          </View>
        ) : null,
      )}
    </Card>
  );
}

/** Screen 7, Explore: browse and search entry for everyone. Native ads (Free) after the 5th row. */
export default function Explore() {
  const signedIn = useSignedIn();
  const comps = useCompetitions();
  const analysed = useMatches({ analysed: true });
  const concepts = useConcepts();
  const recent = analysed.data?.pages.flatMap((p) => p.matches).slice(0, 6) ?? [];
  return (
    <Screen
      refreshing={comps.isRefetching}
      onRefresh={() => {
        comps.refetch();
        analysed.refetch();
      }}
      bottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <T v="display" style={{ flex: 1 }} accessibilityRole="header">
          Explore
        </T>
        {signedIn ? <AvatarButton /> : null}
      </View>
      <Stack gap={30}>
        <Rise index={0}>
          <SearchEntry />
        </Rise>
        <Rise index={1}>
          <SectionHeader title="Recently analysed" sub="Matches with full tactical analysis" action="All matches" onAction={() => router.push({ pathname: '/matches', params: { analysed: '1' } })} />
          <View style={{ height: 12 }} />
          <QueryBoundary query={{ ...analysed, data: analysed.data }} skeleton={<CardsSkeleton count={1} />} isEmpty={() => recent.length === 0}>
            {() => (
              <Stack gap={12}>
                {recent.map((m) => (
                  <MatchCard key={m.id} m={m} />
                ))}
              </Stack>
            )}
          </QueryBoundary>
        </Rise>
        <Rise index={2}>
          <SectionHeader title="Competitions" />
          <View style={{ height: 12 }} />
          <QueryBoundary query={comps} skeleton={<Skeleton h={240} r={20} />}>
            {(d) => <CompetitionList comps={d.competitions} />}
          </QueryBoundary>
        </Rise>
        <Rise index={3}>
          <SectionHeader title="Popular concepts" action="Glossary" onAction={() => router.navigate('/learn')} />
          <View style={{ height: 12 }} />
          <QueryBoundary query={concepts} skeleton={<CardsSkeleton count={2} />}>
            {(d) => (
              <Stack gap={10}>
                {d.concepts.slice(0, 4).map((x) => (
                  <ConceptCard key={x.key} c={x} compact />
                ))}
              </Stack>
            )}
          </QueryBoundary>
        </Rise>
      </Stack>
    </Screen>
  );
}
