import { router } from 'expo-router';
import { View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { useMetricDefinitions } from '@/api/hooks';
import type { CoverageLabel, Depth, Direction, MetricDefLite, MetricValue } from '@/api/types';
import { fmtNum } from '@/lib/format';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Row, Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Lift } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { T } from '@/ui/Text';
import { CoverageBadge } from './badges';
import { DIRECTION } from './ExplainSheet';

/** Value with its unit: 54.9%, 2.76 xG, 9.95, 38.2 m. */
export function withUnit(v: number | null | undefined, unit: string | null | undefined) {
  if (v === null || v === undefined) return '—';
  const n = fmtNum(v);
  if (!unit || unit === 'count' || unit === 'kicks') return n;
  if (unit === '%') return `${n}%`;
  if (unit === 'm' || unit === 's') return `${n} ${unit}`;
  if (unit === 'xG' || unit === 'xT') return `${n} ${unit}`;
  return n;
}

/** Which side is better given the metric's direction; null when neutral or tied. */
export function better(home: number | null, away: number | null, dir: Direction): 'home' | 'away' | null {
  if (home === null || away === null || home === away || dir === 'neutral') return null;
  const homeHigher = home > away;
  return dir === 'higher_better' ? (homeHigher ? 'home' : 'away') : homeHigher ? 'away' : 'home';
}

/**
 * Paired comparison bar: home solid, away hatched (so they differ by pattern, not colour alone).
 * Bars are proportional to each other (largest = full width).
 */
export function PairedBar({ home, away, highlight }: { home: number | null; away: number | null; highlight: 'home' | 'away' | null }) {
  const { c } = useTheme();
  const max = Math.max(Math.abs(home ?? 0), Math.abs(away ?? 0), 1e-9);
  const hw = Math.max(0.02, Math.abs(home ?? 0) / max);
  const aw = Math.max(0.02, Math.abs(away ?? 0) / max);
  return (
    <View style={{ gap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceHigh, overflow: 'hidden' }}>
        <View style={{ width: `${hw * 100}%`, height: 8, borderRadius: 4, backgroundColor: c.home, opacity: highlight === 'away' ? 0.55 : 1 }} />
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceHigh, overflow: 'hidden' }}>
        <Svg width={`${aw * 100}%`} height={8}>
          <Defs>
            <Pattern id="hatch" width="5" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <Rect width="5" height="8" fill={c.awaySoft} />
              <Line x1="0" y1="0" x2="0" y2="8" stroke={c.away} strokeWidth={3} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="8" rx={4} fill="url(#hatch)" opacity={highlight === 'home' ? 0.55 : 1} />
        </Svg>
      </View>
    </View>
  );
}

/** Metric definition sheet: depth text, direction, coverage, formula (Advanced), links. */
export function MetricSheet({ metricKey, sample }: { metricKey: string; sample?: string }) {
  const depth = useSettings((s) => s.depth);
  const defs = useMetricDefinitions();
  const { closeSheet } = useOverlay();
  const d = defs.byKey.get(metricKey);
  if (!d) return <T v="body" color="muted">Loading definition…</T>;
  const text: Record<Depth, string | null> = { quick: d.descriptionQuick, explore: d.descriptionExplore, advanced: d.descriptionAdvanced };
  const dir = DIRECTION[d.direction];
  return (
    <Stack gap={14}>
      <T v="body">{text[depth] ?? d.descriptionQuick}</T>
      <Row wrap gap={8}>
        <Tag size="sm" icon={dir.icon}>
          {dir.label}
        </Tag>
        <CoverageBadge label={d.coverageLabel} />
        {d.unit ? <Tag size="sm">{`Unit: ${d.unit}`}</Tag> : null}
      </Row>
      {depth === 'advanced' && d.formula ? (
        <View style={{ gap: 4 }}>
          <T v="eyebrow" color="muted">
            Formula · v{d.version}
          </T>
          <T v="bodySm" style={{ fontFamily: 'Inter_500Medium' }} selectable>
            {d.formula}
          </T>
        </View>
      ) : null}
      {sample ? (
        <T v="caption" color="muted">
          {sample}
        </T>
      ) : null}
      {d.conceptKeys?.[0] ? (
        <Button
          label="Explain this"
          icon="school"
          variant="ink"
          chevron={false}
          onPress={() => {
            closeSheet();
            router.push(`/concept/${d.conceptKeys[0]}`);
          }}
        />
      ) : null}
      <Button
        label="Full definition"
        variant="secondary"
        onPress={() => {
          closeSheet();
          router.push(`/metric/${d.key}`);
        }}
      />
    </Stack>
  );
}

/**
 * Metric tile: name, home and away values with unit, paired bar, direction cue, coverage badge,
 * Explain affordance (tap the tile).
 */
export function MetricTile({
  metricKey,
  def,
  home,
  away,
  homeName,
  awayName,
  highlighted,
}: {
  metricKey: string;
  def: MetricDefLite | undefined;
  home: MetricValue | null | undefined;
  away: MetricValue | null | undefined;
  homeName: string;
  awayName: string;
  highlighted?: boolean;
}) {
  const { c } = useTheme();
  const { openSheet } = useOverlay();
  const dir: Direction = def?.direction ?? 'neutral';
  const hv = home?.value ?? null;
  const av = away?.value ?? null;
  const win = better(hv, av, dir);
  const cov: CoverageLabel = home?.coverageLabel ?? away?.coverageLabel ?? def?.coverageLabel ?? 'calculated';
  const name = def?.name ?? metricKey;
  const sample = [home?.sampleSize != null ? `${homeName}: based on ${home.sampleSize}` : null, away?.sampleSize != null ? `${awayName}: ${away.sampleSize}` : null].filter(Boolean).join(' · ');
  const label = `${name}. ${homeName} ${withUnit(hv, def?.unit)}, ${awayName} ${withUnit(av, def?.unit)}. ${DIRECTION[dir].label}.${win ? ` Better: ${win === 'home' ? homeName : awayName}.` : ''}`;
  return (
    <Lift
      kind="card"
      onPress={() => openSheet(<MetricSheet metricKey={metricKey} sample={sample ? `Sample: ${sample} events.` : undefined} />, { title: name })}
      accessibilityLabel={label}
      accessibilityHint="Explains this metric">
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 16,
          borderWidth: highlighted ? 2 : 1,
          borderColor: highlighted ? (c.name === 'dark' ? c.lime : c.ink) : c.cardLine,
          padding: 14,
          gap: 10,
        }}>
        <Row gap={6}>
          <T v="labelSm" style={{ flex: 1 }} numberOfLines={2}>
            {name}
          </T>
          <Icon name={DIRECTION[dir].icon} size={16} color={c.muted} label={DIRECTION[dir].label} />
          <Icon name="help" size={16} color={c.muted} />
        </Row>
        <Row gap={10} style={{ alignItems: 'flex-end' }}>
          {[
            { v: hv, dim: win === 'away', align: 'flex-start' as const },
            { v: av, dim: win === 'home', align: 'flex-end' as const },
          ].map((x, i) => {
            const full = withUnit(x.v, def?.unit);
            const [num, ...rest] = full.split(' ');
            return (
              <View key={i} style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: x.align, gap: 3, opacity: x.dim ? 0.6 : 1 }}>
                <T v="numberLg" style={{ fontSize: 21, lineHeight: 25 }} numberOfLines={1} adjustsFontSizeToFit>
                  {num}
                </T>
                {rest.length ? (
                  <T v="caption" color="muted">
                    {rest.join(' ')}
                  </T>
                ) : null}
              </View>
            );
          })}
        </Row>
        <PairedBar home={hv} away={av} highlight={win} />
        <View style={{ gap: 6 }}>
          <CoverageBadge label={cov} />
          {win ? (
            <T v="caption" color="muted" numberOfLines={1}>
              {win === 'home' ? homeName : awayName} ahead
            </T>
          ) : null}
        </View>
      </View>
    </Lift>
  );
}

/** Lane breakdown (5 lanes) as two stacked rows of segments. */
export function LaneShares({ home, away, homeName, awayName, title }: { home?: Record<string, number>; away?: Record<string, number>; homeName: string; awayName: string; title: string }) {
  const { c } = useTheme();
  const lanes = ['wide_left', 'halfspace_left', 'central', 'halfspace_right', 'wide_right'];
  const labels = ['Left', 'Left half-space', 'Centre', 'Right half-space', 'Right'];
  const row = (shares: Record<string, number> | undefined, side: 'home' | 'away', name: string) => (
    <View style={{ gap: 4 }}>
      <T v="caption" color="muted">
        {name}
      </T>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {lanes.map((l, i) => {
          const v = shares?.[l] ?? 0;
          const top = Math.max(...lanes.map((x) => shares?.[x] ?? 0));
          return (
            <View
              key={l}
              accessibilityLabel={`${labels[i]} ${Math.round(v * 100)}%`}
              style={{
                flex: 1,
                height: 34,
                borderRadius: 6,
                backgroundColor: side === 'home' ? c.home : c.awaySoft,
                borderWidth: side === 'away' ? 2 : 0,
                borderColor: c.away,
                opacity: 0.25 + 0.75 * (top ? v / top : 0),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <T v="caption" tint={side === 'home' ? '#ffffff' : c.ink} num>
                {Math.round(v * 100)}%
              </T>
            </View>
          );
        })}
      </View>
    </View>
  );
  return (
    <Card padded={false} style={{ padding: 14, gap: 10 }}>
      <T v="labelSm">{title}</T>
      {row(home, 'home', homeName)}
      {row(away, 'away', awayName)}
      <Row>
        <T v="caption" color="muted" style={{ flex: 1 }}>
          Left
        </T>
        <T v="caption" color="muted">
          Centre
        </T>
        <T v="caption" color="muted" style={{ flex: 1, textAlign: 'right' }}>
          Right
        </T>
      </Row>
    </Card>
  );
}
