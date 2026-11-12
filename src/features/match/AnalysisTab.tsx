import { router } from 'expo-router';
import { View } from 'react-native';

import { useEntitlement } from '@/api/hooks';
import { DataSourceFooter } from '@/components/DataSourceFooter';
import { NoEventData, NotAnalysed, SignedOutCard } from '@/components/states';
import { ReanalysisSheet, RemainingChip } from '@/features/analysis/gate';
import { fmtDayMonth } from '@/lib/format';
import { useSignedIn } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Row, Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Rise } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { T } from '@/ui/Text';
import { useMatchCtx } from './context';

const VIEWS = [
  { route: '/match/[matchId]/analysis/metrics', title: 'Metrics', sub: 'Every number, home v away', icon: 'monitoring' },
  { route: '/match/[matchId]/analysis/shape', title: 'Shape', sub: 'Formations and passing network', icon: 'hub' },
  { route: '/match/[matchId]/analysis/pressing', title: 'Pressing', sub: 'How hard and how high', icon: 'compress' },
  { route: '/match/[matchId]/analysis/transitions', title: 'Transitions', sub: 'Winning it back, breaking fast', icon: 'swap_horiz' },
  { route: '/match/[matchId]/analysis/possessions', title: 'Possessions', sub: 'Every spell on the ball', icon: 'timeline' },
  { route: '/match/[matchId]/analysis/shot-map', title: 'Shot map', sub: 'Every shot, sized by xG', icon: 'sports_soccer' },
] as const;

/** Analysis tab landing: view cards + remaining-count chip. Opening a view is metered. */
export function AnalysisTab() {
  const { match, hasEvents, analysable } = useMatchCtx();
  const { c } = useTheme();
  const signedIn = useSignedIn();
  const { openSheet } = useOverlay();
  const ent = useEntitlement('analysis.matches_per_month');
  const reanalyse = () => openSheet(<ReanalysisSheet matchId={match.id} />, { title: 'Request re-analysis' });

  if (!hasEvents) return <NoEventData />;
  if (!signedIn) return <SignedOutCard body="Detailed analysis needs an account. Free includes 20 analysed matches a month." />;
  if (!analysable) return <NotAnalysed queued={match.analysisStatus === 'queued' || match.analysisStatus === 'running'} onRequest={reanalyse} />;

  return (
    <Stack gap={18}>
      <Rise>
        <Row>
          <T v="titleSm" style={{ flex: 1 }}>
            Detailed analysis
          </T>
          <RemainingChip />
        </Row>
        {ent.ent && ent.ent.limitValue !== null ? (
          <T v="caption" color="muted" style={{ marginTop: 6 }}>
            One match counts once a month, however many views you open. Resets {fmtDayMonth(ent.ent.resetsAt)}.
          </T>
        ) : null}
      </Rise>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {VIEWS.map((v, i) => (
          <Rise key={v.route} index={i} style={{ width: '47.5%', flexGrow: 1 }}>
            <Card
              padded={false}
              style={{ padding: 16, minHeight: 132 }}
              onPress={() => router.push({ pathname: v.route, params: { matchId: match.id } })}
              accessibilityLabel={`${v.title}. ${v.sub}`}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: i === 0 ? c.lime : c.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={v.icon} size={21} color={i === 0 ? c.onLime : c.ink} />
              </View>
              <T v="titleSm" style={{ marginTop: 14 }}>
                {v.title}
              </T>
              <T v="caption" color="muted" style={{ marginTop: 3 }}>
                {v.sub}
              </T>
            </Card>
          </Rise>
        ))}
      </View>
      <Card variant="tint">
        <Row gap={12} style={{ alignItems: 'flex-start' }}>
          <Icon name="info" size={20} />
          <T v="bodySm" color="inkSecondary" style={{ flex: 1 }}>
            Everything here comes from on-ball events. Team shape, off-ball runs and physical load need tracking data, which this match doesn't have.
          </T>
        </Row>
      </Card>
      <Button label="Request re-analysis" variant="secondary" icon="refresh" onPress={reanalyse} />
      <DataSourceFooter match={match} />
    </Stack>
  );
}
