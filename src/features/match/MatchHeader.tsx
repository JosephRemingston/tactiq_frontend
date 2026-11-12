import { router } from 'expo-router';
import { View } from 'react-native';

import { useStory } from '@/api/hooks';
import type { MatchDetail } from '@/api/types';
import { FollowButton } from '@/components/FollowButton';
import { useMatchActions, useSaveToggle, shareMatch } from '@/components/MatchActions';
import { TeamBadge } from '@/components/TeamChip';
import { fmtDate, fmtKickoff } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { Tag } from '@/ui/Pill';
import { useOverlay } from '@/ui/overlay';
import { T } from '@/ui/Text';
import { shootoutLine } from './context';

export function AnalysisStatusChip({ match }: { match: MatchDetail }) {
  if (!match.coverage.hasEvents || match.coverage.level === 'fixtures_only')
    return (
      <Tag size="sm" onHero icon="scoreboard">
        No event data
      </Tag>
    );
  switch (match.analysisStatus) {
    case 'complete':
      return (
        <Tag size="sm" tone="lime" icon="check_circle">
          Analysed
        </Tag>
      );
    case 'queued':
    case 'running':
      return (
        <Tag size="sm" tone="warning" icon="schedule">
          Queued · ready soon
        </Tag>
      );
    case 'failed':
      return (
        <Tag size="sm" onHero icon="error">
          Analysis failed
        </Tag>
      );
    default:
      return (
        <Tag size="sm" onHero icon="hourglass_empty">
          Not analysed
        </Tag>
      );
  }
}

function Side({ name, formation, side }: { name: string; formation?: string | null; side: 'home' | 'away' }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
      <TeamBadge name={name} side={side} size={44} onHero />
      <T v="titleSm" tint="#f2f5f6" align="center" numberOfLines={2}>
        {name}
      </T>
      {formation ? (
        <T v="caption" tint="#a9b0b3" num>
          {formation}
        </T>
      ) : null}
    </View>
  );
}

/** The match centre's score header: design.md's dark card with a quieter lime glow. */
export function MatchHeader({ match }: { match: MatchDetail }) {
  const { c } = useTheme();
  const story = useStory(match.id, 'quick');
  const shootout = shootoutLine(story.data?.story.shortVersion);
  const actions = useMatchActions(match);
  const save = useSaveToggle();
  const { openSheet } = useOverlay();
  const saved = save.isMatchSaved(match.id);
  const followTeams = () =>
    openSheet(
      <View style={{ gap: 16 }}>
        {[
          { t: match.home, side: 'home' as const },
          { t: match.away, side: 'away' as const },
        ].map(({ t, side }) => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TeamBadge name={t.name} side={side} size={40} />
            <T v="titleSm" style={{ flex: 1 }}>
              {t.name}
            </T>
            <FollowButton kind="teams" id={t.id} name={t.name} />
          </View>
        ))}
      </View>,
      { title: 'Follow these teams' },
    );
  const scheduled = match.status === 'scheduled';
  const score = scheduled ? fmtKickoff(match.kickoffAt).split(' · ')[1] : `${match.home.score ?? '–'}–${match.away.score ?? '–'}`;
  return (
    <Card variant="hero" glow={0.42} padded={false} style={{ padding: 20 }}>
      <T v="eyebrow" tint={c.heroMuted} align="center">
        {match.competition.name}
        {match.stage ? ` · ${match.stage}` : ''}
      </T>
      <T v="caption" tint={c.heroMuted} align="center" style={{ marginTop: 4 }}>
        {[fmtDate(match.kickoffAt), match.stadiumName].filter(Boolean).join(' · ')}
      </T>
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 18 }}
        accessible
        accessibilityLabel={`${match.home.name} ${scheduled ? '' : match.home.score} ${match.away.name} ${scheduled ? '' : match.away.score}${shootout ? `. ${shootout}` : ''}`}>
        <Side name={match.home.name} formation={match.home.formation} side="home" />
        <View style={{ paddingHorizontal: 8, alignItems: 'center', minWidth: 104 }}>
          <T v="score" tint="#f2f5f6" style={{ fontSize: scheduled ? 28 : 44, lineHeight: scheduled ? 34 : 48 }} maxFontSizeMultiplier={1.3}>
            {score}
          </T>
          <T v="caption" tint={c.heroMuted} style={{ marginTop: 2 }}>
            {scheduled ? 'Kick-off' : match.status === 'played' ? (match.coverage.dataQuality?.hasExtraTime ? 'After extra time' : 'Full time') : match.status}
          </T>
        </View>
        <Side name={match.away.name} formation={match.away.formation} side="away" />
      </View>
      {shootout ? (
        <T v="labelSm" tint={c.lime} align="center" style={{ marginTop: 12 }}>
          {shootout}
        </T>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 14 }}>
        <AnalysisStatusChip match={match} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingTop: 6 }}>
        <IconButton icon="group_add" label="Follow the teams" color="#f2f5f6" onPress={followTeams} />
        <IconButton icon={saved ? 'bookmark' : 'bookmark_add'} filled={saved} label={saved ? 'Remove from saved' : 'Save match'} color="#f2f5f6" onPress={() => save.toggleMatch(match.id)} />
        <IconButton icon="edit_note" label="Add note" color="#f2f5f6" onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'new', subjectType: 'match', subjectId: match.id } })} />
        <IconButton icon="compare_arrows" label="Compare" color="#f2f5f6" onPress={() => router.push({ pathname: '/compare', params: { a: match.id } })} />
        <IconButton icon="share" label="Share" color="#f2f5f6" onPress={() => shareMatch(match)} />
        <IconButton icon="more_horiz" label="More actions" color="#f2f5f6" onPress={actions.open} />
      </View>
    </Card>
  );
}

/** Compact score shown in the top bar once the hero scrolls away. */
export function CompactScore({ match }: { match: MatchDetail }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TeamBadge name={match.home.name} side="home" size={24} />
      <T v="title" num>
        {match.status === 'scheduled' ? 'v' : `${match.home.score ?? '–'}–${match.away.score ?? '–'}`}
      </T>
      <TeamBadge name={match.away.name} side="away" size={24} />
      <Icon name="unfold_less" size={18} color={c.muted} />
    </View>
  );
}
