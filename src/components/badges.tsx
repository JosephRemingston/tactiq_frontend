import { View } from 'react-native';

import type { AnalysisStatus, Confidence, CoverageLabel, CoverageLevel, MatchStatus } from '@/api/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Tag } from '@/ui/Pill';
import { T } from '@/ui/Text';

export const COVERAGE_LABEL: Record<CoverageLabel, { label: string; icon: string; tip: string }> = {
  observed: { label: 'Observed', icon: 'visibility', tip: 'Counted directly from match events, like shots or passes.' },
  calculated: { label: 'Calculated', icon: 'calculate', tip: 'Worked out from events with a formula, like PPDA.' },
  inferred: { label: 'Inferred', icon: 'psychology', tip: 'An interpretation by a model, like a player’s role. Treat it as a reading, not a fact.' },
};

/** Coverage badge: observed / calculated / inferred (inferred uses the neutral inferred tone). */
export function CoverageBadge({ label, size = 'sm', onHero }: { label: CoverageLabel; size?: 'sm' | 'md'; onHero?: boolean }) {
  const d = COVERAGE_LABEL[label];
  return (
    <Tag size={size} icon={d.icon} tone={label === 'inferred' ? 'inferred' : 'neutral'} onHero={onHero && label !== 'inferred'} accessibilityLabel={`${d.label}. ${d.tip}`}>
      {d.label}
    </Tag>
  );
}

const CONF: Record<Confidence, { label: string; icon: string; tone: 'success' | 'warning' | 'error' }> = {
  high: { label: 'High confidence', icon: 'signal_cellular_alt', tone: 'success' },
  medium: { label: 'Medium confidence', icon: 'signal_cellular_alt_2_bar', tone: 'warning' },
  low: { label: 'Low confidence', icon: 'signal_cellular_alt_1_bar', tone: 'error' },
};

export function ConfidencePill({ value, size = 'sm' }: { value: Confidence; size?: 'sm' | 'md' }) {
  const d = CONF[value];
  return (
    <Tag size={size} tone={d.tone} icon={d.icon} accessibilityLabel={d.label}>
      {d.label.split(' ')[0]}
    </Tag>
  );
}

export function AnalysisBadge({ status, level, onHero }: { status: AnalysisStatus; level: CoverageLevel; onHero?: boolean }) {
  if (level === 'fixtures_only')
    return (
      <Tag size="sm" icon="scoreboard" onHero={onHero}>
        Score only
      </Tag>
    );
  if (status === 'complete')
    return (
      <Tag size="sm" tone="lime" icon="check_circle">
        Analysed
      </Tag>
    );
  if (status === 'queued' || status === 'running')
    return (
      <Tag size="sm" tone="warning" icon="schedule" onHero={onHero}>
        Queued
      </Tag>
    );
  return (
    <Tag size="sm" icon="hourglass_empty" onHero={onHero}>
      Not analysed
    </Tag>
  );
}

const LEVEL: Record<CoverageLevel, { label: string; dots: number }> = {
  fixtures_only: { label: 'Score only', dots: 1 },
  events: { label: 'Event data', dots: 2 },
  events_and_freeze_frames: { label: 'Events + freeze frames', dots: 3 },
  tracking: { label: 'Tracking', dots: 4 },
};

/** Coverage dot: filled dots show how much data exists (shape, not colour alone). */
export function CoverageDot({ level, onHero, showLabel = true }: { level: CoverageLevel; onHero?: boolean; showLabel?: boolean }) {
  const { c } = useTheme();
  const d = LEVEL[level];
  const ink = onHero ? '#f2f5f6' : c.ink;
  return (
    <View accessible accessibilityLabel={`Data: ${d.label}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 2.5 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i < d.dots ? ink : 'transparent', borderWidth: 1, borderColor: ink, opacity: i < d.dots ? 0.85 : 0.35 }} />
        ))}
      </View>
      {showLabel ? (
        <T v="caption" tint={onHero ? '#a9b0b3' : c.muted}>
          {d.label}
        </T>
      ) : null}
    </View>
  );
}

export function StatusTag({ status }: { status: MatchStatus }) {
  if (status === 'postponed')
    return (
      <Tag size="sm" tone="warning" icon="event_busy">
        Postponed
      </Tag>
    );
  if (status === 'cancelled')
    return (
      <Tag size="sm" tone="error" icon="cancel">
        Cancelled
      </Tag>
    );
  if (status === 'scheduled')
    return (
      <Tag size="sm" icon="event">
        Scheduled
      </Tag>
    );
  return (
    <Tag size="sm" icon="sports_score">
      Full time
    </Tag>
  );
}
