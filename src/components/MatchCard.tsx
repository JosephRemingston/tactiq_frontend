import { router } from 'expo-router';
import { View } from 'react-native';

import type { MatchSummary } from '@/api/types';
import { fmtDate, fmtKickoff, fmtTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { T } from '@/ui/Text';
import { AnalysisBadge, CoverageDot, StatusTag } from './badges';
import { useMatchActions } from './MatchActions';
import { TeamBadge } from './TeamChip';

function TeamLine({ name, score, side, big, scheduled }: { name: string; score: number | null; side: 'home' | 'away'; big?: boolean; scheduled?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <TeamBadge name={name} side={side} size={big ? 32 : 28} />
      <T v={big ? 'titleSm' : 'label'} style={{ flex: 1 }} numberOfLines={1}>
        {name}
      </T>
      {!scheduled ? (
        <T v="numberLg" style={{ fontSize: big ? 26 : 22, lineHeight: big ? 28 : 24, minWidth: 22, textAlign: 'right' }}>
          {score ?? '–'}
        </T>
      ) : null}
    </View>
  );
}

/**
 * Match card. `large`: list rows. `compact`: carousel tiles (fixed width).
 * Competition + stage, kick-off, teams with team-colour badges, score or kick-off time, status,
 * analysis badge and coverage dot. The overflow menu holds Compare, Save, Add to collection.
 */
export function MatchCard({ m, variant = 'large', width }: { m: MatchSummary; variant?: 'large' | 'compact'; width?: number }) {
  const { c } = useTheme();
  const actions = useMatchActions(m);
  const scheduled = m.status === 'scheduled';
  const big = variant === 'large';
  const label = `${m.competition.name}${m.stage ? `, ${m.stage}` : ''}. ${m.home.name} ${scheduled ? '' : (m.home.score ?? '')} ${m.away.name} ${scheduled ? '' : (m.away.score ?? '')}. ${scheduled ? `Kick-off ${fmtKickoff(m.kickoffAt)}` : fmtDate(m.kickoffAt)}. ${m.analysisStatus === 'complete' ? 'Analysed' : ''}`;
  return (
    <Card
      onPress={() => router.push(`/match/${m.id}`)}
      onLongPress={actions.open}
      accessibilityLabel={label}
      accessibilityHint="Opens the match centre"
      padded={false}
      style={[{ padding: big ? 18 : 16 }, width ? { width } : null]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <T v="eyebrow" color="muted" numberOfLines={1}>
            {m.competition.name}
            {m.stage ? ` · ${m.stage}` : ''}
          </T>
          <T v="caption" color="muted" style={{ marginTop: 2 }} num>
            {scheduled ? fmtKickoff(m.kickoffAt) : fmtDate(m.kickoffAt)}
          </T>
        </View>
        {big ? <IconButton icon="more_vert" label={`More actions for ${m.home.name} v ${m.away.name}`} onPress={actions.open} size={22} /> : null}
      </View>
      <View style={{ gap: 10 }}>
        <TeamLine name={m.home.name} score={m.home.score} side="home" big={big} scheduled={scheduled} />
        <TeamLine name={m.away.name} score={m.away.score} side="away" big={big} scheduled={scheduled} />
      </View>
      {scheduled ? (
        <View style={{ marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 10, height: 28, borderRadius: 8, backgroundColor: c.surfaceHigh, justifyContent: 'center' }}>
          <T v="labelSm" num>
            Kick-off {fmtTime(m.kickoffAt)}
          </T>
        </View>
      ) : null}
      <View style={{ height: 1, backgroundColor: c.line, marginVertical: 14 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {m.status !== 'played' ? <StatusTag status={m.status} /> : null}
        {m.status === 'played' ? <AnalysisBadge status={m.analysisStatus} level={m.coverage.level} /> : null}
        <View style={{ flex: 1 }} />
        <CoverageDot level={m.coverage.level} showLabel={big} />
      </View>
    </Card>
  );
}
