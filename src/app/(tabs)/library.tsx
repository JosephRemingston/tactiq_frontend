import { oneOf } from '@/security/validate';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  useCollectionMutations,
  useCollections,
  useEntitlement,
  useFollowMutation,
  useFollowing,
  useNotes,
  useSavedInsights,
  useSavedMatches,
} from '@/api/hooks';
import type { FollowKind, NoteSubject } from '@/api/types';
import { AvatarButton } from '@/components/Avatar';
import { CollectionForm } from '@/components/CollectionSheet';
import { useSaveToggle } from '@/components/MatchActions';
import { MatchCard } from '@/components/MatchCard';
import { QueryBoundary } from '@/components/QueryBoundary';
import { IconTile, ListRow } from '@/components/rows';
import { CardsSkeleton, EmptyState, StateBlock } from '@/components/states';
import { TeamBadge } from '@/components/TeamChip';
import { fmtRelative } from '@/lib/format';
import { useSignedIn } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Row, SectionHeader, Stack } from '@/ui/bits';
import { Chip, ChipBar } from '@/ui/Chip';
import { Rise } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { Segmented } from '@/ui/Segmented';
import { Tabs } from '@/ui/Tabs';
import { T } from '@/ui/Text';

type Tab = 'following' | 'saved' | 'notes' | 'collections';

function Following() {
  const q = useFollowing();
  const m = useFollowMutation();
  const { confirm } = useOverlay();
  const groups: { kind: FollowKind; title: string; route: (id: string) => string; icon: string }[] = [
    { kind: 'teams', title: 'Clubs and national teams', route: (id) => `/team/${id}`, icon: 'groups' },
    { kind: 'competitions', title: 'Competitions', route: (id) => `/competition/${id}`, icon: 'trophy' },
    { kind: 'players', title: 'Players', route: (id) => `/player/${id}`, icon: 'person' },
  ];
  return (
    <QueryBoundary query={q} skeleton={<CardsSkeleton count={3} />}>
      {({ following }) => {
        const total = following.teams.length + following.competitions.length + following.players.length;
        if (!total) return <EmptyState icon="favorite" title="You don't follow anything yet" body="Follow a club or competition to build your home feed." action="Find clubs" onAction={() => router.push('/search')} />;
        return (
          <Stack gap={20}>
            {groups.map((g) => {
              const items = following[g.kind];
              return (
                <View key={g.kind}>
                  <SectionHeader title={g.title} action="Add" onAction={() => router.push('/search')} />
                  {items.length ? (
                    <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 10 }}>
                      {items.map((it, i) => (
                        <View key={it.id}>
                          {i > 0 ? <Divider inset={54} /> : null}
                          <ListRow
                            leading={g.kind === 'teams' ? <TeamBadge name={it.name} side="home" size={38} /> : <IconTile icon={g.icon} />}
                            title={('knownName' in it && it.knownName) || it.name}
                            sub={it.countryName}
                            onPress={() => router.push(g.route(it.id) as never)}
                            chevron={false}
                            trailing={
                              <Button
                                label="Unfollow"
                                variant="secondary"
                                compact
                                full={false}
                                onPress={() =>
                                  confirm({ title: `Unfollow ${it.name}?`, confirm: 'Unfollow', onConfirm: () => m.mutate({ kind: g.kind, id: it.id, on: false }) })
                                }
                              />
                            }
                          />
                        </View>
                      ))}
                    </Card>
                  ) : (
                    <T v="bodySm" color="muted" style={{ marginTop: 8 }}>
                      Nothing yet.
                    </T>
                  )}
                </View>
              );
            })}
          </Stack>
        );
      }}
    </QueryBoundary>
  );
}

function SavedCounter() {
  const { c } = useTheme();
  const e = useEntitlement('following.max_saved_items');
  const sm = useSavedMatches();
  const si = useSavedInsights();
  if (!e.ent || e.ent.limitValue === null) return null;
  const count = (sm.data?.pages.reduce((a, p) => a + p.savedMatches.length, 0) ?? 0) + (si.data?.pages.reduce((a, p) => a + p.savedInsights.length, 0) ?? 0);
  const limit = e.ent.limitValue;
  return (
    <View style={{ gap: 6 }}>
      <Row>
        <T v="labelSm" style={{ flex: 1 }} num>
          {count} of {limit} saved
        </T>
        {count >= limit * 0.9 ? (
          <T v="caption" color="warning">
            Nearly full
          </T>
        ) : null}
      </Row>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceHigh, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: limit, now: count }}>
        <View style={{ width: `${Math.min(100, (count / limit) * 100)}%`, height: 6, backgroundColor: count >= limit ? c.error : c.ink }} />
      </View>
    </View>
  );
}

function Saved() {
  const [seg, setSeg] = useState<'matches' | 'insights'>('matches');
  const sm = useSavedMatches();
  const si = useSavedInsights();
  const save = useSaveToggle();
  const { confirm } = useOverlay();
  const matches = useMemo(() => sm.data?.pages.flatMap((p) => p.savedMatches) ?? [], [sm.data]);
  const insights = useMemo(() => si.data?.pages.flatMap((p) => p.savedInsights) ?? [], [si.data]);
  return (
    <Stack gap={16}>
      <SavedCounter />
      <Segmented
        label="Saved type"
        value={seg}
        onChange={setSeg}
        options={[
          { value: 'matches', label: 'Matches' },
          { value: 'insights', label: 'Insights' },
        ]}
      />
      {seg === 'matches' ? (
        <QueryBoundary query={sm} skeleton={<CardsSkeleton count={2} />} isEmpty={() => !matches.length} empty={<EmptyState icon="bookmark" title="No saved matches" body="Save a match to find it here." action="Browse matches" onAction={() => router.push('/matches')} />}>
          {() => (
            <Stack gap={12}>
              <T v="caption" color="muted">
                Long-press a match to remove it.
              </T>
              {matches.map((s) => (
                <View key={s.match.id}>
                  <MatchCard m={s.match} />
                </View>
              ))}
              {sm.hasNextPage ? <Button label="Load more" variant="secondary" loading={sm.isFetchingNextPage} onPress={() => sm.fetchNextPage()} /> : null}
            </Stack>
          )}
        </QueryBoundary>
      ) : (
        <QueryBoundary query={si} skeleton={<CardsSkeleton count={2} />} isEmpty={() => !insights.length} empty={<EmptyState icon="lightbulb" title="No saved insights" body="Save an insight from any match to find it here." />}>
          {() => (
            <Stack gap={12}>
              {insights.map((s) => (
                <Card
                  key={s.id}
                  onPress={() => router.push({ pathname: '/match/[matchId]', params: { matchId: s.matchId, tab: 'insights' } })}
                  onLongPress={() => confirm({ title: 'Remove this insight?', body: s.headline, confirm: 'Remove', destructive: true, onConfirm: () => save.toggleInsight(s.insightId) })}
                  accessibilityHint="Long-press to remove">
                  <T v="titleSm">{s.headline}</T>
                  <T v="bodySm" color="inkSecondary" style={{ marginTop: 6 }}>
                    {s.whatHappened}
                  </T>
                  <T v="caption" color="muted" style={{ marginTop: 8 }}>
                    Saved {fmtRelative(s.savedAt)}
                  </T>
                </Card>
              ))}
              {si.hasNextPage ? <Button label="Load more" variant="secondary" loading={si.isFetchingNextPage} onPress={() => si.fetchNextPage()} /> : null}
            </Stack>
          )}
        </QueryBoundary>
      )}
    </Stack>
  );
}

const SUBJECT: Record<NoteSubject, { label: string; icon: string }> = {
  match: { label: 'Match', icon: 'sports_soccer' },
  team: { label: 'Team', icon: 'groups' },
  player: { label: 'Player', icon: 'person' },
  insight: { label: 'Insight', icon: 'lightbulb' },
};

function Notes() {
  const [type, setType] = useState<NoteSubject | undefined>();
  const q = useNotes({ subjectType: type });
  return (
    <Stack gap={14}>
      <ChipBar>
        <Chip label="All" selected={!type} onPress={() => setType(undefined)} />
        {(Object.keys(SUBJECT) as NoteSubject[]).map((s) => (
          <Chip key={s} label={SUBJECT[s].label} icon={SUBJECT[s].icon} selected={type === s} onPress={() => setType(type === s ? undefined : s)} />
        ))}
      </ChipBar>
      <QueryBoundary query={q} skeleton={<CardsSkeleton count={2} />} isEmpty={(d) => !d.notes.length} empty={<EmptyState icon="edit_note" title="No notes yet" body="Add a note from any match, team, player or insight." />}>
        {(d) => (
          <Stack gap={10}>
            {d.notes.map((n) => (
              <Card key={n.id} onPress={() => router.push({ pathname: '/note/[id]', params: { id: n.id } })}>
                <Row gap={8}>
                  <Tag size="sm" icon={SUBJECT[n.subjectType].icon}>
                    {SUBJECT[n.subjectType].label}
                  </Tag>
                  <View style={{ flex: 1 }} />
                  <T v="caption" color="muted">
                    {fmtRelative(n.updatedAt)}
                  </T>
                </Row>
                <T v="body" style={{ marginTop: 10 }} numberOfLines={3}>
                  {n.body}
                </T>
              </Card>
            ))}
          </Stack>
        )}
      </QueryBoundary>
    </Stack>
  );
}

function Collections() {
  const q = useCollections();
  const m = useCollectionMutations();
  const { openSheet, closeSheet, snack } = useOverlay();
  const create = () =>
    openSheet(
      <CollectionForm
        submitLabel="Create collection"
        onSubmit={(v) =>
          m.create.mutate(
            { name: v.name, ...(v.description ? { description: v.description } : {}) },
            {
              onSuccess: (r) => {
                closeSheet();
                router.push({ pathname: '/collection/[id]', params: { id: r.collection.id } });
              },
              onError: () => snack("Couldn't create it. Try again."),
            },
          )
        }
      />,
      { title: 'New collection' },
    );
  return (
    <Stack gap={14}>
      <Button label="New collection" icon="create_new_folder" variant="ink" chevron={false} onPress={create} />
      <QueryBoundary query={q} skeleton={<CardsSkeleton count={2} />} isEmpty={(d) => !d.collections.length} empty={<EmptyState icon="folder" title="No collections yet" body="Group matches, insights, players and notes into collections." />}>
        {(d) => (
          <Stack gap={10}>
            {d.collections.map((col) => (
              <Card key={col.id} onPress={() => router.push({ pathname: '/collection/[id]', params: { id: col.id } })}>
                <Row gap={12}>
                  <IconTile icon="folder" />
                  <View style={{ flex: 1 }}>
                    <T v="titleSm">{col.name}</T>
                    {col.description ? (
                      <T v="bodySm" color="muted" numberOfLines={2}>
                        {col.description}
                      </T>
                    ) : null}
                  </View>
                  <T v="number" color="muted">
                    {col.items}
                  </T>
                </Row>
              </Card>
            ))}
          </Stack>
        )}
      </QueryBoundary>
    </Stack>
  );
}

/** Screen 32, Library: Following, Saved, Notes, Collections. Private to the user. */
export default function Library() {
  const signedIn = useSignedIn();
  const p = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(oneOf(p.tab, ['following', 'saved', 'notes', 'collections'] as const, 'saved'));
  return (
    <Screen bottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <T v="display" style={{ flex: 1 }} accessibilityRole="header">
          Library
        </T>
        {signedIn ? <AvatarButton /> : null}
      </View>
      {!signedIn ? (
        <StateBlock
          icon="bookmarks"
          title="Sign in to save"
          body="Your saved matches and insights, notes and collections live here, private to you."
          action="Sign in"
          onAction={() => router.push('/sign-in')}
        />
      ) : (
        <Stack gap={18}>
          <Tabs
            tabs={[
              { value: 'following', label: 'Following' },
              { value: 'saved', label: 'Saved' },
              { value: 'notes', label: 'Notes' },
              { value: 'collections', label: 'Collections' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <Rise key={tab}>{tab === 'following' ? <Following /> : tab === 'saved' ? <Saved /> : tab === 'notes' ? <Notes /> : <Collections />}</Rise>
        </Stack>
      )}
    </Screen>
  );
}
