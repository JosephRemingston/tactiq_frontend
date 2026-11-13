import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useSearch } from '@/api/hooks';
import type { SearchResults } from '@/api/types';
import { QueryBoundary } from '@/components/QueryBoundary';
import { IconTile, ListRow } from '@/components/rows';
import { CardsSkeleton, EmptyState } from '@/components/states';
import { TeamBadge } from '@/components/TeamChip';
import { SponsoredCard, useInterleaved } from '@/services/ads';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { Divider, Stack } from '@/ui/bits';
import { Chip, ChipBar } from '@/ui/Chip';
import { IconButton } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Kind = 'competition' | 'team' | 'player' | 'concept';
const KINDS: { value: Kind; label: string }[] = [
  { value: 'team', label: 'Teams' },
  { value: 'player', label: 'Players' },
  { value: 'competition', label: 'Competitions' },
  { value: 'concept', label: 'Concepts' },
];

type Hit = { kind: Kind; id: string; title: string; sub: string | null };

function flatten(r: SearchResults, only: Kind | null): { group: Kind; hits: Hit[] }[] {
  const groups: { group: Kind; hits: Hit[] }[] = [
    { group: 'competition', hits: r.competitions.map((x) => ({ kind: 'competition', id: x.id, title: x.name, sub: x.countryName })) },
    { group: 'team', hits: r.teams.map((x) => ({ kind: 'team', id: x.id, title: x.name, sub: x.isNationalTeam ? 'National team' : x.countryName })) },
    { group: 'player', hits: r.players.map((x) => ({ kind: 'player', id: x.id, title: x.knownName ?? x.name, sub: [x.knownName && x.knownName !== x.name ? x.name : null, x.countryName].filter(Boolean).join(' · ') })) },
    { group: 'concept', hits: r.concepts.map((x) => ({ kind: 'concept', id: x.key, title: x.name, sub: x.simpleText })) },
  ];
  return groups.filter((g) => g.hits.length && (!only || g.group === only));
}

const GROUP_TITLE: Record<Kind, string> = { competition: 'Competitions', team: 'Teams', player: 'Players', concept: 'Concepts' };

function open(h: Hit) {
  if (h.kind === 'competition') router.push(`/competition/${h.id}`);
  else if (h.kind === 'team') router.push(`/team/${h.id}`);
  else if (h.kind === 'player') router.push(`/player/${h.id}`);
  else router.push(`/concept/${h.id}`);
}

function HitRow({ h }: { h: Hit }) {
  return (
    <ListRow
      leading={
        h.kind === 'team' ? (
          <TeamBadge name={h.title} side="home" size={40} />
        ) : (
          <IconTile icon={h.kind === 'competition' ? 'trophy' : h.kind === 'player' ? 'person' : 'school'} />
        )
      }
      title={h.title}
      sub={h.sub}
      onPress={() => open(h)}
    />
  );
}

function Results({ data, only }: { data: SearchResults; only: Kind | null }) {
  const groups = flatten(data, only);
  // Ads count across the flattened result list: after the 5th result, then every 8th.
  const all = useMemo(() => groups.flatMap((g) => g.hits.map((h, i) => ({ ...h, first: i === 0, group: g.group }))), [groups]);
  const { rows, ads } = useInterleaved(all, 'explore', data.adSlots);
  if (!groups.length) return <EmptyState icon="search_off" title="No results" body="Try a different spelling, or a team, player or competition name." />;
  return (
    <Stack gap={4}>
      {rows.map((r) =>
        r.kind === 'ad' ? (
          ads.native && ads.cfg ? (
            <View key={`ad${r.slot}`} style={{ marginVertical: 10 }}>
              <SponsoredCard id={`search:${r.slot}`} placement={ads.native.placement.key} cfg={ads.cfg} max={ads.native.max} />
            </View>
          ) : null
        ) : (
          <View key={`${r.item.kind}:${r.item.id}`}>
            {r.item.first ? (
              <T v="eyebrow" color="muted" style={{ marginTop: r.index === 0 ? 4 : 22, marginBottom: 2 }}>
                {GROUP_TITLE[r.item.group]}
              </T>
            ) : (
              <Divider inset={54} />
            )}
            <HitRow h={r.item} />
          </View>
        ),
      )}
    </Stack>
  );
}

/** Screen 8, Search results: 2–80 characters, four groups of up to 8, filter chips by type. */
export default function Search() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(typeof params.q === 'string' ? params.q.slice(0, 80) : '');
  const [debounced, setDebounced] = useState(q);
  const [only, setOnly] = useState<Kind | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);
  const search = useSearch(debounced);
  const short = debounced.trim().length < 2;

  return (
    <Screen
      header={
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.bg }}>
          <IconButton icon="arrow_back" label="Back" onPress={() => router.back()} />
          <TextField
            containerStyle={{ flex: 1 }}
            icon="search"
            value={q}
            onChangeText={setQ}
            placeholder="Search Tactiq"
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            maxLength={80}
            trailing={q ? <IconButton icon="close" label="Clear search" size={20} onPress={() => setQ('')} /> : null}
          />
        </View>
      }>
      <ChipBar style={{ marginBottom: 18 }}>
        <Chip label="All" selected={!only} onPress={() => setOnly(null)} />
        {KINDS.map((k) => (
          <Chip key={k.value} label={k.label} selected={only === k.value} onPress={() => setOnly(only === k.value ? null : k.value)} />
        ))}
      </ChipBar>
      {short ? (
        <Card variant="tint">
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="keyboard" color={c.muted} />
            <T v="bodySm" color="inkSecondary" style={{ flex: 1 }}>
              Type at least 2 characters to search teams, players, competitions and tactical concepts.
            </T>
          </View>
        </Card>
      ) : (
        <QueryBoundary query={search} skeleton={<CardsSkeleton count={3} />}>
          {(d) => <Results data={d} only={only} />}
        </QueryBoundary>
      )}
    </Screen>
  );
}
