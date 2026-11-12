import { router } from 'expo-router';
import { View } from 'react-native';

import { useConcept, useMetricDefinitions } from '@/api/hooks';
import type { Depth } from '@/api/types';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { Skeleton, Stack } from '@/ui/bits';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { T } from '@/ui/Text';
import { CoverageBadge } from './badges';

export const DIRECTION: Record<string, { label: string; icon: string }> = {
  higher_better: { label: 'Higher is better', icon: 'trending_up' },
  lower_better: { label: 'Lower is better', icon: 'trending_down' },
  neutral: { label: 'Neither higher nor lower is better', icon: 'trending_flat' },
};

/** "Explain this": a term's simple text and a link to the full page. Metric keys explain the metric. */
export function ExplainSheet({ conceptKey, metricKey }: { conceptKey?: string; metricKey?: string }) {
  const { closeSheet } = useOverlay();
  const depth = useSettings((s) => s.depth);
  const defs = useMetricDefinitions();
  const def = metricKey ? defs.byKey.get(metricKey) : undefined;
  const key = conceptKey ?? def?.conceptKeys?.[0];
  const concept = useConcept(key ?? '');

  if (metricKey) {
    if (!def) return <Skeleton h={80} />;
    const text: Record<Depth, string | null> = { quick: def.descriptionQuick, explore: def.descriptionExplore, advanced: def.descriptionAdvanced };
    const d = DIRECTION[def.direction];
    return (
      <Stack gap={14}>
        <T v="body">{text[depth] ?? def.descriptionQuick}</T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Tag size="sm" icon={d.icon}>
            {d.label}
          </Tag>
          <CoverageBadge label={def.coverageLabel} />
        </View>
        {concept.data ? (
          <T v="bodySm" color="inkSecondary">
            {concept.data.concept.name}: {concept.data.concept.simpleText}
          </T>
        ) : null}
        <Button
          label="Full definition"
          variant="secondary"
          onPress={() => {
            closeSheet();
            router.push(`/metric/${def.key}`);
          }}
        />
      </Stack>
    );
  }

  if (concept.isLoading) return <Skeleton h={80} />;
  const c = concept.data?.concept;
  if (!c)
    return (
      <T v="body" color="muted">
        We don't have an explanation for this yet.
      </T>
    );
  return (
    <Stack gap={14}>
      <T v="titleSm">{c.name}</T>
      <T v="body">{c.simpleText}</T>
      <Button
        label="Open in Learn"
        variant="secondary"
        onPress={() => {
          closeSheet();
          router.push(`/concept/${c.key}`);
        }}
      />
    </Stack>
  );
}
