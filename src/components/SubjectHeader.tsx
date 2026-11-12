import { router } from 'expo-router';

import { useMatch, usePlayer, useSavedInsights, useTeam } from '@/api/hooks';
import type { NoteSubject } from '@/api/types';
import { Card } from '@/ui/Card';
import { Skeleton } from '@/ui/bits';
import { MatchCard } from './MatchCard';
import { IconTile, ListRow } from './rows';
import { TeamBadge } from './TeamChip';

/** What a note (or collection item) is about, rendered with its own card. */
export function SubjectHeader({ type, id }: { type: NoteSubject | 'note'; id: string }) {
  const match = useMatch(type === 'match' ? id : '');
  const team = useTeam(type === 'team' ? id : '');
  const player = usePlayer(type === 'player' ? id : '');
  const saved = useSavedInsights();
  const insight = type === 'insight' ? saved.data?.pages.flatMap((p) => p.savedInsights).find((x) => x.insightId === id) : undefined;
  if (type === 'match') return match.data ? <MatchCard m={match.data.match} /> : <Skeleton h={120} r={20} />;
  if (type === 'team')
    return team.data ? (
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <ListRow leading={<TeamBadge name={team.data.team.name} side="home" size={38} />} title={team.data.team.name} sub={team.data.team.isNationalTeam ? 'National team' : team.data.team.countryName} onPress={() => router.push(`/team/${id}`)} />
      </Card>
    ) : (
      <Skeleton h={64} r={20} />
    );
  if (type === 'player')
    return player.data ? (
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <ListRow leading={<IconTile icon="person" />} title={player.data.player.knownName ?? player.data.player.name} sub={player.data.player.countryName} onPress={() => router.push(`/player/${id}`)} />
      </Card>
    ) : (
      <Skeleton h={64} r={20} />
    );
  return (
    <Card padded={false} style={{ paddingHorizontal: 16 }}>
      <ListRow
        leading={<IconTile icon={type === 'insight' ? 'lightbulb' : 'edit_note'} />}
        title={insight?.headline ?? (type === 'insight' ? 'Insight' : 'Note')}
        sub={insight ? 'Saved insight' : type === 'insight' ? 'A note on an insight' : null}
        onPress={insight ? () => router.push({ pathname: '/match/[matchId]', params: { matchId: insight.matchId, tab: 'insights' } }) : undefined}
      />
    </Card>
  );
}
