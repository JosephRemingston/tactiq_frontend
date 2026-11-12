import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useMetricDefinition } from '@/api/hooks';
import type { Depth, MetricDefinition } from '@/api/types';
import { CoverageBadge } from '@/components/badges';
import { DepthSwitch } from '@/components/DepthSwitch';
import { DIRECTION } from '@/components/ExplainSheet';
import { QueryBoundary } from '@/components/QueryBoundary';
import { useSettings } from '@/state/settings';
import { Banner } from '@/ui/Banner';
import { Card } from '@/ui/Card';
import { Row, SectionHeader, Stack } from '@/ui/bits';
import { Chip, ChipWrap } from '@/ui/Chip';
import { Rise, Swap } from '@/ui/motion';
import { Eyebrow, Tag } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

function Body({ d }: { d: MetricDefinition }) {
  const depth = useSettings((s) => s.depth);
  const text: Record<Depth, string | null> = { quick: d.descriptionQuick, explore: d.descriptionExplore, advanced: d.descriptionAdvanced };
  const dir = DIRECTION[d.direction];
  const caveats = Object.entries(d.providerCaveats ?? {});
  return (
    <Stack gap={20}>
      <Rise>
        <Eyebrow icon="monitoring">{`${d.family} metric · v${d.version}`}</Eyebrow>
        <T v="display" style={{ marginTop: 14 }}>
          {d.name}
        </T>
        <Row wrap gap={8} style={{ marginTop: 12 }}>
          <Tag size="sm" icon={dir.icon}>
            {dir.label}
          </Tag>
          {d.unit ? <Tag size="sm">{`Unit: ${d.unit}`}</Tag> : null}
          <CoverageBadge label={d.coverageLabel} />
        </Row>
      </Rise>
      {d.status === 'planned' ? (
        <Banner tone="warning" title="Not available yet">
          This metric needs tracking data, which no match has today, so it has no values.
        </Banner>
      ) : null}
      <DepthSwitch />
      <Card>
        <Swap swapKey={depth}>
          <T v="body">{text[depth] ?? d.descriptionQuick}</T>
        </Swap>
      </Card>
      {depth === 'advanced' && d.formula ? (
        <Card variant="tint">
          <T v="eyebrow" color="muted">
            Formula
          </T>
          <T v="body" style={{ marginTop: 6, fontFamily: 'Inter_500Medium' }} selectable>
            {d.formula}
          </T>
          {d.requires ? (
            <T v="caption" color="muted" style={{ marginTop: 8 }}>
              Needs: {Object.entries(d.requires).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' ')).join(', ')}
            </T>
          ) : null}
        </Card>
      ) : null}
      <View>
        <SectionHeader title="Data caveats" />
        <Stack gap={8} style={{ marginTop: 10 }}>
          {caveats.map(([provider, note]) => (
            <Banner key={provider} tone="info" title={provider === 'statsbomb' ? 'StatsBomb data' : provider}>
              {note}
            </Banner>
          ))}
          <Banner tone="info">FBref/Opta use different rules, so values are not directly comparable.</Banner>
        </Stack>
      </View>
      {d.conceptKeys.length ? (
        <View>
          <SectionHeader title="Linked concepts" />
          <View style={{ marginTop: 10 }}>
            <ChipWrap>
              {d.conceptKeys.map((k) => (
                <Chip key={k} label={k.replace(/-/g, ' ')} icon="school" onPress={() => router.push(`/concept/${k}`)} />
              ))}
            </ChipWrap>
          </View>
        </View>
      ) : null}
    </Stack>
  );
}

/** Screen 31, Metric definition. */
export default function MetricPage() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const q = useMetricDefinition(key);
  return (
    <Screen header={<TopBar title={q.data?.metricDefinition.name} />}>
      <QueryBoundary query={q}>{(d) => <Body d={d.metricDefinition} />}</QueryBoundary>
    </Screen>
  );
}
