import { oneOf } from '@/security/validate';
import { guardParams } from '@/components/ParamGuard';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMatch } from '@/api/hooks';
import { QueryBoundary } from '@/components/QueryBoundary';
import { CardsSkeleton, OfflineBanner } from '@/components/states';
import { AnalysisTab } from '@/features/match/AnalysisTab';
import { MatchProvider } from '@/features/match/context';
import { InsightsTab } from '@/features/match/InsightsTab';
import { LineupsTab } from '@/features/match/LineupsTab';
import { CompactScore, MatchHeader } from '@/features/match/MatchHeader';
import { Overview } from '@/features/match/Overview';
import { StoryTab } from '@/features/match/StoryTab';
import { TimelineTab } from '@/features/match/TimelineTab';
import { useSignedIn } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { Skeleton, Stack } from '@/ui/bits';
import { Card } from '@/ui/Card';
import { Tabs } from '@/ui/Tabs';
import { TopBar } from '@/ui/TopBar';

type Tab = 'overview' | 'story' | 'insights' | 'timeline' | 'lineups' | 'analysis';

function HeaderSkeleton() {
  return (
    <Card variant="hero">
      <Stack gap={12} style={{ alignItems: 'center' }}>
        <Skeleton w="50%" h={10} />
        <Skeleton w="70%" h={44} />
        <Skeleton w="40%" h={12} />
      </Stack>
    </Card>
  );
}

/** Screens 14–18 (+ Analysis landing): the match centre. Sticky score header over six tabs. No ads. */
function MatchCentre() {
  const { matchId, tab: initial } = useLocalSearchParams<{ matchId: string; tab?: Tab }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 840;
  const signedIn = useSignedIn();
  const q = useMatch(matchId);
  const [tab, setTab] = useState<Tab>(oneOf(initial, ['overview', 'story', 'insights', 'timeline', 'lineups', 'analysis'] as const, 'overview'));
  const [heroH, setHeroH] = useState(320);
  const [compact, setCompact] = useState(false);

  const tabs = [
    { value: 'overview' as const, label: 'Overview' },
    { value: 'story' as const, label: 'Story' },
    { value: 'insights' as const, label: 'Insights' },
    { value: 'timeline' as const, label: 'Timeline' },
    { value: 'lineups' as const, label: 'Lineups' },
    { value: 'analysis' as const, label: 'Analysis', locked: !signedIn },
  ];

  const content = (t: Tab) => {
    switch (t) {
      case 'story':
        return <StoryTab />;
      case 'insights':
        return <InsightsTab />;
      case 'timeline':
        return <TimelineTab />;
      case 'lineups':
        return <LineupsTab />;
      case 'analysis':
        return <AnalysisTab />;
      default:
        return <Overview />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopBar
        title={undefined}
        left={undefined}
        actions={
          compact && q.data && !wide ? (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ marginRight: 12 }}>
              <CompactScore match={q.data.match} />
            </Animated.View>
          ) : null
        }
      />
      <QueryBoundary
        query={q}
        allowForced={['loading', 'error', 'notFound', 'offline']}
        skeleton={
          <View style={{ padding: 16, gap: 16 }}>
            <HeaderSkeleton />
            <CardsSkeleton count={2} />
          </View>
        }>
        {({ match }) => (
          <MatchProvider match={match}>
            {wide ? (
              <View style={{ flex: 1, flexDirection: 'row', gap: 20, paddingHorizontal: 20 }}>
                <ScrollView style={{ width: 360, flexGrow: 0 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
                  <MatchHeader match={match} />
                </ScrollView>
                <View style={{ flex: 1 }}>
                  <Tabs tabs={tabs} value={tab} onChange={setTab} />
                  <ScrollView contentContainerStyle={{ paddingTop: 18, paddingBottom: insets.bottom + 32 }}>{content(tab)}</ScrollView>
                </View>
              </View>
            ) : (
              <ScrollView
                stickyHeaderIndices={[1]}
                scrollEventThrottle={32}
                onScroll={(e) => setCompact(e.nativeEvent.contentOffset.y > heroH - 40)}
                contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
                <View style={{ paddingHorizontal: 16, paddingBottom: 8 }} onLayout={(e) => setHeroH(e.nativeEvent.layout.height)}>
                  <MatchHeader match={match} />
                </View>
                <View style={{ backgroundColor: c.bg, paddingHorizontal: 12 }}>
                  <Tabs tabs={tabs} value={tab} onChange={setTab} />
                </View>
                <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>{content(tab)}</View>
              </ScrollView>
            )}
          </MatchProvider>
        )}
      </QueryBoundary>
      <OfflineBanner />
    </View>
  );
}

// Ids from the route are validated before the screen mounts (deep links are untrusted).
export default guardParams({ matchId: 'uuid' }, MatchCentre);
