import { useInsights } from '@/api/hooks';
import { DataSourceFooter } from '@/components/DataSourceFooter';
import { DepthSwitch } from '@/components/DepthSwitch';
import { QueryBoundary } from '@/components/QueryBoundary';
import { CardsSkeleton, EmptyState, NoEventData } from '@/components/states';
import { useSettings } from '@/state/settings';
import { Stack } from '@/ui/bits';
import { Rise } from '@/ui/motion';
import { T } from '@/ui/Text';
import { useMatchCtx } from './context';
import { InsightCard } from './InsightCard';

/** Screen 16, Insights: ranked insight cards at the chosen depth. Free for everyone. */
export function InsightsTab() {
  const { match, hasEvents } = useMatchCtx();
  const depth = useSettings((s) => s.depth);
  const q = useInsights(match.id, depth, hasEvents);
  if (!hasEvents) return <NoEventData />;
  return (
    <Stack gap={18}>
      <DepthSwitch />
      <T v="bodySm" color="muted">
        Ranked by how strongly the data shows each pattern. Every card says how sure it is and what it is based on.
      </T>
      <QueryBoundary
        query={q}
        skeleton={<CardsSkeleton count={3} />}
        isEmpty={(d) => !d.insights.length}
        empty={<EmptyState icon="insights" title="No insights yet" body="Insights appear once the match has been analysed." />}>
        {(d) => (
          <Stack gap={14}>
            {d.insights.map((i, idx) => (
              <Rise key={i.id} index={idx}>
                <InsightCard insight={i} depth={depth} rank={i.rank} />
              </Rise>
            ))}
          </Stack>
        )}
      </QueryBoundary>
      <DataSourceFooter match={match} />
    </Stack>
  );
}
