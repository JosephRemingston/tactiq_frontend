import { router } from 'expo-router';
import { View } from 'react-native';

import { useMetricDefinitions } from '@/api/hooks';
import type { Depth, Evidence, Insight, StoryPattern } from '@/api/types';
import { ConfidencePill, CoverageBadge } from '@/components/badges';
import { useSaveToggle } from '@/components/MatchActions';
import { TeamChip } from '@/components/TeamChip';
import { fmtNum, PERIOD_LABEL } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Row } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Swap } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { T } from '@/ui/Text';
import { useMatchCtx } from './context';
import { ExplainSheet } from '@/components/ExplainSheet';
import { openExplore, VIEW_LABEL } from './explore';

const ZONE_LABEL: Record<string, string> = {
  zone_14: 'Zone 14',
  final_third: 'Final third',
  box: 'Penalty box',
  left: 'Left side',
  right: 'Right side',
  centre: 'Centre',
  half_spaces: 'Half-spaces',
  high: 'High up the pitch',
};

const norm = (t: string | null | undefined) => (t ?? '').trim().replace(/[.!]+$/, '').toLowerCase();

export function EvidenceRow({ ev, compact }: { ev: Evidence | undefined; compact?: boolean }) {
  const { c } = useTheme();
  const defs = useMetricDefinitions();
  const { openSheet } = useOverlay();
  if (!ev) return null;
  const parts: string[] = [];
  const m = ev.metrics?.[0];
  const zones = (ev.zones ?? []).map((z) => ZONE_LABEL[z] ?? z.replace(/_/g, ' '));
  const periods = (ev.periods ?? []).map((p) => PERIOD_LABEL[p] ?? `Period ${p}`);
  if (zones.length) parts.push(zones.join(', '));
  if (periods.length && periods.length < 4) parts.push(periods.join(', '));
  if (!m && !parts.length) return null;
  const def = m ? defs.byKey.get(m.key) : undefined;
  return (
    <View style={{ backgroundColor: c.surfaceLow, borderRadius: 12, padding: 12, gap: 4 }}>
      {m ? (
        <Row gap={6}>
          <Icon name="query_stats" size={16} color={c.muted} />
          <T
            v="labelSm"
            style={{ flex: 1 }}
            onPress={() => openSheet(<ExplainSheet metricKey={m.key} />, { title: def?.name ?? 'Explain this' })}
            accessibilityRole="button"
            accessibilityHint="Explains this metric">
            {def?.name ?? m.key}: <T v="labelSm" num>{fmtNum(m.value)}</T>
            {def?.unit && !/count|passes per|^%$/.test(def.unit) ? ` ${def.unit}` : ''}
          </T>
          <Icon name="help" size={16} color={c.muted} />
        </Row>
      ) : null}
      {!compact && parts.length ? (
        <T v="caption" color="muted">
          {parts.join(' · ')}
          {ev.totalEvents ? ` · ${ev.totalEvents} events` : ''}
        </T>
      ) : null}
    </View>
  );
}

/**
 * Insight card. Quick: headline + one plain sentence. Explore: what happened and why it matters.
 * Advanced: adds the metric definition text and version. Text cross-fades on depth change.
 */
export function InsightCard({ insight, depth, rank }: { insight: Insight | (StoryPattern & Partial<Insight>); depth: Depth; rank?: number }) {
  const { c } = useTheme();
  const ctx = useMatchCtx();
  const save = useSaveToggle();
  const side = ctx.sideOf(insight.teamId);
  const saved = save.isInsightSaved(insight.id);
  const full = 'whatHappened' in insight && typeof insight.whatHappened === 'string';
  const texts = insight.depth;
  const link = insight.exploreLink;
  const metric = insight.evidence?.metrics?.[0];

  return (
    <Card>
      <Row gap={8}>
        {side ? <TeamChip name={ctx.nameOf(insight.teamId)} side={side} /> : null}
        <View style={{ flex: 1 }} />
        {rank ? (
          <T v="caption" color="muted" num>
            #{rank}
          </T>
        ) : null}
      </Row>
      <T v="title" style={{ marginTop: 12 }} accessibilityRole="header">
        {insight.headline}
      </T>
      <Swap swapKey={depth} style={{ marginTop: 10 }}>
        {depth === 'quick' || !full ? (
          // Quick text is often the headline itself; only show it when it adds something.
          norm(texts?.[depth] ?? insight.explanation) !== norm(insight.headline) ? (
            <T v="body" color="inkSecondary">
              {texts?.[depth] ?? insight.explanation}
            </T>
          ) : null
        ) : (
          <View style={{ gap: 12 }}>
            <View>
              <T v="eyebrow" color="muted">
                What happened
              </T>
              <T v="body" style={{ marginTop: 4 }}>
                {insight.whatHappened}
              </T>
            </View>
            <View>
              <T v="eyebrow" color="muted">
                Why it matters
              </T>
              <T v="body" color="inkSecondary" style={{ marginTop: 4 }}>
                {insight.whyItMatters}
              </T>
            </View>
            {depth === 'advanced' && texts?.advanced ? (
              <View style={{ borderLeftWidth: 3, borderColor: c.name === 'dark' ? c.lime : c.limeDeep, paddingLeft: 12 }}>
                <T v="eyebrow" color="muted">
                  Method
                </T>
                <T v="bodySm" color="inkSecondary" style={{ marginTop: 4 }}>
                  {texts.advanced}
                </T>
                {metric ? (
                  <T v="caption" color="muted" style={{ marginTop: 4 }}>
                    {metric.key} · v{metric.version} · scope {metric.scope}
                    {typeof insight.completeness === 'number' ? ` · completeness ${Math.round(insight.completeness * 100)}%` : ''}
                  </T>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </Swap>
      <Row gap={8} wrap style={{ marginTop: 14 }}>
        <ConfidencePill value={insight.confidence} />
        <CoverageBadge label={insight.coverageLabel} />
      </Row>
      {depth !== 'quick' ? (
        <View style={{ marginTop: 12 }}>
          <EvidenceRow ev={insight.evidence} />
        </View>
      ) : null}
      <View style={{ height: 1, backgroundColor: c.line, marginVertical: 12 }} />
      <Row gap={4}>
        {link ? (
          <Button
            label={`Explore ${VIEW_LABEL[link.view] ?? ''}`.trim()}
            variant="ink"
            compact
            full={false}
            icon="query_stats"
            accessibilityHint="Opens the detailed analysis. Uses your monthly allowance on Free."
            onPress={() => openExplore(link)}
          />
        ) : null}
        <View style={{ flex: 1 }} />
        <IconButton icon={saved ? 'bookmark' : 'bookmark_add'} filled={saved} label={saved ? 'Remove from saved' : 'Save insight'} onPress={() => save.toggleInsight(insight.id)} />
        <IconButton
          icon="edit_note"
          label="Add note"
          onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'new', subjectType: 'insight', subjectId: insight.id } })}
        />
      </Row>
    </Card>
  );
}
