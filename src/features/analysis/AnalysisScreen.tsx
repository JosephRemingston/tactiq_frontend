import { useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMatch } from '@/api/hooks';
import type { MatchDetail, MetricScope } from '@/api/types';
import { DataSourceFooter } from '@/components/DataSourceFooter';
import { QueryBoundary } from '@/components/QueryBoundary';
import { CardsSkeleton, OfflineBanner } from '@/components/states';
import { MatchProvider } from '@/features/match/context';
import { useTheme } from '@/theme/ThemeProvider';
import { Chip, ChipBar } from '@/ui/Chip';
import { useOverlay } from '@/ui/overlay';
import { TopBar } from '@/ui/TopBar';
import { IconButton } from '@/ui/Button';
import { AnalysisGate, ReanalysisSheet, RemainingChip } from './gate';

export const SCOPE_LABEL: Record<MetricScope, string> = {
  full: 'Full match',
  '1H': '1st half',
  '2H': '2nd half',
  ET: 'Extra time',
  leading: 'Leading',
  drawing: 'Drawing',
  trailing: 'Trailing',
};
const ORDER: MetricScope[] = ['full', '1H', '2H', 'ET', 'leading', 'drawing', 'trailing'];

export function ScopeChips({ value, onChange, available }: { value: MetricScope; onChange: (s: MetricScope) => void; available: MetricScope[] }) {
  const list = ORDER.filter((s) => available.includes(s));
  return (
    <ChipBar>
      {list.map((s) => (
        <Chip key={s} label={SCOPE_LABEL[s]} selected={value === s} onPress={() => onChange(s)} />
      ))}
    </ChipBar>
  );
}

export function useMatchParam() {
  return useLocalSearchParams<{ matchId: string; scope?: MetricScope; teamId?: string; keys?: string; family?: string }>();
}

/**
 * Frame for every analysis view: top bar with the match, the gate (sign-in, metering, states),
 * and at ≥ 840dp an optional side-by-side layout (pitch | explanation).
 */
export function AnalysisScreen({
  title,
  children,
  side,
}: {
  title: string;
  children: (m: MatchDetail, wide: boolean) => ReactNode;
  /** Wide layouts render `side` next to the main column. */
  side?: (m: MatchDetail) => ReactNode;
}) {
  const { matchId } = useMatchParam();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 840 && !!side;
  const q = useMatch(matchId);
  const { openSheet } = useOverlay();
  const m = q.data?.match;
  const sub = m ? `${m.home.name} ${m.home.score ?? ''}–${m.away.score ?? ''} ${m.away.name}` : undefined;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopBar
        title={title}
        sub={sub}
        actions={
          <>
            <RemainingChip />
            <IconButton icon="refresh" label="Request re-analysis" onPress={() => openSheet(<ReanalysisSheet matchId={matchId} />, { title: 'Request re-analysis' })} />
          </>
        }
      />
      <QueryBoundary query={q} allowForced={['loading', 'notFound', 'error']}>
        {({ match }) => (
          <MatchProvider match={match}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
              <AnalysisGate matchId={match.id} onRequestAnalysis={() => openSheet(<ReanalysisSheet matchId={match.id} />, { title: 'Request re-analysis' })}>
                {wide ? (
                  <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
                    <View style={{ flex: 1.35 }}>{children(match, true)}</View>
                    <View style={{ flex: 1 }}>{side!(match)}</View>
                  </View>
                ) : (
                  <>
                    {children(match, false)}
                    {side ? <View style={{ marginTop: 24 }}>{side(match)}</View> : null}
                  </>
                )}
              </AnalysisGate>
              <View style={{ marginTop: 24 }}>
                <DataSourceFooter match={match} />
              </View>
            </ScrollView>
          </MatchProvider>
        )}
      </QueryBoundary>
      <OfflineBanner />
    </View>
  );
}

export function AnalysisSkeleton() {
  return <CardsSkeleton count={2} pitch />;
}
