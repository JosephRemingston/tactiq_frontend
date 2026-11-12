import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFeed } from '@/api/hooks';
import type { Feed, MatchSummary } from '@/api/types';
import { AvatarButton } from '@/components/Avatar';
import { ConceptCard } from '@/components/ConceptCard';
import { MatchCard } from '@/components/MatchCard';
import { QueryBoundary } from '@/components/QueryBoundary';
import { CardsSkeleton, EmptyState, StateBlock } from '@/components/states';
import { TeamChip } from '@/components/TeamChip';
import { SponsoredCard, useInterleaved } from '@/services/ads';
import { useSignedIn } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { SectionHeader, Skeleton, Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Wordmark } from '@/ui/Logo';
import { Rise } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';

function HomeBar() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  return (
    <View style={{ paddingTop: insets.top + 6, paddingLeft: 16, paddingRight: 6, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: c.bg }}>
      <Wordmark size={21} />
      <View style={{ flex: 1 }} />
      <IconButton icon="search" label="Search" onPress={() => router.push('/search')} />
      <AvatarButton />
    </View>
  );
}

const CARD_W = 284;

function RecentCarousel({ matches, feedSlots }: { matches: MatchSummary[]; feedSlots: NonNullable<ReturnType<typeof useFeed>['data']>['adSlots'] }) {
  const { rows, ads } = useInterleaved(matches, 'home', feedSlots);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_W + 12}
      decelerationRate="fast"
      contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}
      style={{ marginHorizontal: -16, marginVertical: -8 }}>
      {rows.map((r) =>
        r.kind === 'item' ? (
          <MatchCard key={r.item.id} m={r.item} variant="compact" width={CARD_W} />
        ) : ads.native && ads.cfg ? (
          <View key={`ad${r.slot}`} style={{ width: CARD_W }}>
            <SponsoredCard id={`home:${r.slot}`} placement={ads.native.placement.key} cfg={ads.cfg} max={ads.native.max} />
          </View>
        ) : null,
      )}
    </ScrollView>
  );
}

function teamSide(feed: Feed, matchId: string, teamId: string | null) {
  const m = feed.recent.find((x) => x.id === matchId);
  if (!m || !teamId) return null;
  if (m.home.id === teamId) return { name: m.home.name, side: 'home' as const, match: m };
  if (m.away.id === teamId) return { name: m.away.name, side: 'away' as const, match: m };
  return null;
}

function FeedBody({ data }: { data: NonNullable<ReturnType<typeof useFeed>['data']> }) {
  const { c } = useTheme();
  const feed = data.feed;
  const upcoming = useMemo(() => feed.upcoming.slice(0, 10), [feed.upcoming]);
  if (feed.empty)
    return (
      <EmptyState
        icon="favorite"
        title="Make this feed yours"
        body={feed.nextStep ?? 'Follow a club or competition to personalise your feed.'}
        action="Find clubs"
        onAction={() => router.push('/search')}
      />
    );
  return (
    <Stack gap={30}>
      <Rise index={0}>
        <SectionHeader title="Recent matches" sub="Newest first" action="All" onAction={() => router.push('/matches')} />
        <View style={{ height: 14 }} />
        <RecentCarousel matches={feed.recent.slice(0, 10)} feedSlots={data.adSlots} />
      </Rise>

      <Rise index={1}>
        <SectionHeader title="Coming up" sub="Times in your time zone" />
        <View style={{ height: 12 }} />
        {upcoming.length ? (
          <Stack gap={12}>
            {upcoming.map((m) => (
              <MatchCard key={m.id} m={m} />
            ))}
          </Stack>
        ) : (
          <Card variant="tint">
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Icon name="event_available" color={c.muted} />
              <T v="bodySm" color="inkSecondary" style={{ flex: 1 }}>
                No upcoming matches for what you follow. New fixtures appear here when they are scheduled.
              </T>
            </View>
          </Card>
        )}
      </Rise>

      {feed.insights.length ? (
        <Rise index={2}>
          <SectionHeader title="Top insights" sub="The standout pattern from each recent match" />
          <View style={{ height: 12 }} />
          <Stack gap={12}>
            {feed.insights.map((i) => {
              const t = teamSide(feed, i.matchId, i.teamId);
              return (
                <Card key={i.id} onPress={() => router.push({ pathname: '/match/[matchId]', params: { matchId: i.matchId, tab: 'insights' } })} accessibilityLabel={`${i.headline}. Explore`}>
                  {t ? <TeamChip name={t.name} side={t.side} /> : null}
                  <T v="title" style={{ marginTop: 12 }}>
                    {i.headline}
                  </T>
                  {t ? (
                    <T v="caption" color="muted" style={{ marginTop: 6 }}>
                      {t.match.home.name} v {t.match.away.name} · {t.match.competition.name}
                    </T>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14 }}>
                    <T v="labelSm">Explore</T>
                    <Icon name="arrow_forward" size={18} />
                  </View>
                </Card>
              );
            })}
          </Stack>
        </Rise>
      ) : null}

      {feed.concepts.length ? (
        <Rise index={3}>
          <SectionHeader title="Learn this" sub="Words behind these insights" />
          <View style={{ height: 12 }} />
          <Stack gap={10}>
            {feed.concepts.slice(0, 3).map((x) => (
              <ConceptCard key={x.key} c={x} />
            ))}
          </Stack>
        </Rise>
      ) : null}
    </Stack>
  );
}

function SignedOutHome() {
  return (
    <Screen>
      <View style={{ height: 24 }} />
      <Wordmark size={22} />
      <View style={{ height: 28 }} />
      <StateBlock
        icon="home"
        title="Your football, explained"
        body="Sign in to get a home feed for the clubs and competitions you follow."
        action="Sign in"
        onAction={() => router.push('/sign-in')}
        secondary="Browse matches"
        onSecondary={() => router.navigate('/explore')}
      />
    </Screen>
  );
}

/** Screen 6, Home feed. Free users see one native Sponsored card in Recent (never inside an insight). */
export default function Home() {
  const signedIn = useSignedIn();
  const feed = useFeed();
  if (!signedIn) return <SignedOutHome />;
  return (
    <Screen header={<HomeBar />} refreshing={feed.isRefetching} onRefresh={() => feed.refetch()} bottomInset={false}>
      <QueryBoundary
        query={feed}
        skeleton={
          <Stack gap={14}>
            <Skeleton w="45%" h={20} />
            <CardsSkeleton count={2} />
          </Stack>
        }
        empty={<EmptyState title="Make this feed yours" body="Follow a club or competition to personalise your feed." action="Find clubs" onAction={() => router.push('/search')} />}>
        {(d) => <FeedBody data={d} />}
      </QueryBoundary>
    </Screen>
  );
}
