import { guardParams } from '@/components/ParamGuard';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCompetitions, useMatches, useTeams, type MatchFilters } from '@/api/hooks';
import { MatchCard } from '@/components/MatchCard';
import { QueryBoundary } from '@/components/QueryBoundary';
import { CardsSkeleton, EmptyState } from '@/components/states';
import { ListRow } from '@/components/rows';
import { BannerAd, useAds } from '@/services/ads';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Divider, Stack } from '@/ui/bits';
import { Chip, ChipBar } from '@/ui/Chip';
import { useOverlay } from '@/ui/overlay';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { TopBar } from '@/ui/TopBar';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string) => ISO_DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

function PickSheet<T extends { id: string; label: string; sub?: string | null }>({ items, onPick, selected }: { items: T[]; onPick: (v: T | null) => void; selected?: string }) {
  return (
    <View>
      <ListRow title="Any" onPress={() => onPick(null)} trailing={!selected ? <T v="labelSm">Selected</T> : null} chevron={false} />
      {items.map((it) => (
        <View key={it.id}>
          <Divider />
          <ListRow title={it.label} sub={it.sub} onPress={() => onPick(it)} chevron={false} trailing={selected === it.id ? <T v="labelSm">Selected</T> : null} />
        </View>
      ))}
    </View>
  );
}

function DateSheet({ from, to, onApply }: { from?: string; to?: string; onApply: (f?: string, t?: string) => void }) {
  const [f, setF] = useState(from ?? '');
  const [t, setT] = useState(to ?? '');
  const fe = f && !validDate(f) ? 'Use YYYY-MM-DD, a real date' : null;
  const te = t && !validDate(t) ? 'Use YYYY-MM-DD, a real date' : t && f && validDate(f) && validDate(t) && t < f ? 'Must be on or after the start date' : null;
  return (
    <Stack gap={14}>
      <TextField label="From" value={f} onChangeText={setF} placeholder="2022-11-20" error={fe} keyboardType="numbers-and-punctuation" maxLength={10} />
      <TextField label="To" value={t} onChangeText={setT} placeholder="2022-12-18" error={te} keyboardType="numbers-and-punctuation" maxLength={10} />
      <Button label="Apply dates" variant="ink" disabled={!!fe || !!te} onPress={() => onApply(f || undefined, t || undefined)} />
      <Button label="Clear dates" variant="text" onPress={() => onApply(undefined, undefined)} />
    </Stack>
  );
}

/** Screen 10, Matches list: filters, infinite scroll, newest first, a bottom banner for Free users. */
function Matches() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { openSheet, closeSheet } = useOverlay();
  const p = useLocalSearchParams<{ competitionId?: string; seasonId?: string; teamId?: string; analysed?: string; title?: string }>();
  const [f, setF] = useState<MatchFilters>({
    competitionId: p.competitionId,
    seasonId: p.seasonId,
    teamId: p.teamId,
    analysed: p.analysed === '1' ? true : undefined,
  });
  const comps = useCompetitions();
  const teams = useTeams({ competitionId: f.competitionId, seasonId: f.seasonId }, !!f.competitionId);
  const q = useMatches(f);
  const ads = useAds('matches_list');
  const matches = useMemo(() => q.data?.pages.flatMap((pg) => pg.matches) ?? [], [q.data]);
  const comp = comps.data?.competitions.find((x) => x.id === f.competitionId);
  const season = comp?.seasons.find((s) => s.id === f.seasonId);
  const team = teams.data?.pages.flatMap((pg) => pg.teams).find((t) => t.id === f.teamId);

  const set = (patch: Partial<MatchFilters>) => setF((cur) => ({ ...cur, ...patch }));

  const filterBar = (
    <ChipBar style={{ marginBottom: 14 }}>
      <Chip
        label={comp?.name ?? 'Competition'}
        selected={!!comp}
        onPress={() =>
          openSheet(
            <PickSheet
              selected={f.competitionId}
              items={(comps.data?.competitions ?? []).map((x) => ({ id: x.id, label: x.name, sub: x.countryName }))}
              onPick={(v) => {
                closeSheet();
                set({ competitionId: v?.id, seasonId: undefined, teamId: undefined });
              }}
            />,
            { title: 'Competition' },
          )
        }
      />
      <Chip
        label={season ? season.name : 'Season'}
        selected={!!season}
        onPress={() =>
          comp
            ? openSheet(
                <PickSheet
                  selected={f.seasonId}
                  items={comp.seasons.map((s) => ({ id: s.id, label: s.name }))}
                  onPick={(v) => {
                    closeSheet();
                    set({ seasonId: v?.id });
                  }}
                />,
                { title: 'Season' },
              )
            : openSheet(<T v="body" color="muted">Pick a competition first.</T>, { title: 'Season' })
        }
      />
      <Chip
        label={team?.name ?? 'Team'}
        selected={!!f.teamId}
        onPress={() =>
          comp
            ? openSheet(
                <PickSheet
                  selected={f.teamId}
                  items={(teams.data?.pages.flatMap((pg) => pg.teams) ?? []).map((t) => ({ id: t.id, label: t.name, sub: t.isNationalTeam ? 'National team' : t.countryName }))}
                  onPick={(v) => {
                    closeSheet();
                    set({ teamId: v?.id });
                  }}
                />,
                { title: 'Team' },
              )
            : openSheet(<T v="body" color="muted">Pick a competition first.</T>, { title: 'Team' })
        }
      />
      <Chip
        label={f.from || f.to ? `${f.from ?? '…'} – ${f.to ?? '…'}` : 'Dates'}
        icon="date_range"
        selected={!!(f.from || f.to)}
        onPress={() =>
          openSheet(
            <DateSheet
              from={f.from}
              to={f.to}
              onApply={(from, to) => {
                closeSheet();
                set({ from, to });
              }}
            />,
            { title: 'Date range' },
          )
        }
      />
      <Chip label="Played" selected={f.status === 'played'} onPress={() => set({ status: f.status === 'played' ? undefined : 'played' })} />
      <Chip label="Scheduled" selected={f.status === 'scheduled'} onPress={() => set({ status: f.status === 'scheduled' ? undefined : 'scheduled' })} />
      <Chip label="Analysed only" icon="query_stats" selected={!!f.analysed} onPress={() => set({ analysed: f.analysed ? undefined : true })} />
    </ChipBar>
  );

  return (
    <Screen
      scroll={false}
      header={<TopBar title={typeof p.title === 'string' && p.title ? p.title.slice(0, 60) : 'Matches'} sub="Newest first" />}
      footer={ads.banner && ads.cfg ? <View style={{ paddingBottom: insets.bottom, backgroundColor: c.sponsored }}><BannerAd cfg={ads.cfg} placementKey={ads.banner.key} max={ads.banner.maxPerSession} /></View> : null}>
      <QueryBoundary
        query={q}
        skeleton={
          <View style={{ padding: 16 }}>
            {filterBar}
            <CardsSkeleton count={3} />
          </View>
        }>
        {() => (
          <FlatList
            data={matches}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: (ads.banner ? 16 : insets.bottom) + 24, gap: 12 }}
            ListHeaderComponent={filterBar}
            renderItem={({ item }) => <MatchCard m={item} />}
            onEndReachedThreshold={0.6}
            onEndReached={() => {
              if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
            }}
            refreshing={q.isRefetching && !q.isFetchingNextPage}
            onRefresh={() => q.refetch()}
            ListEmptyComponent={<EmptyState icon="event_busy" title="No matches" body="Nothing matches these filters. Try removing one." />}
            ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={c.ink} style={{ marginVertical: 20 }} /> : undefined}
          />
        )}
      </QueryBoundary>
    </Screen>
  );
}

// Ids from the route are validated before the screen mounts (deep links are untrusted).
export default guardParams({ competitionId: 'uuid?', seasonId: 'uuid?', teamId: 'uuid?' }, Matches);
