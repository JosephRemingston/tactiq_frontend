import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import { useTeam, useTeamPlayers } from '@/api/hooks';
import { QueryBoundary } from '@/components/QueryBoundary';
import { CardsSkeleton, EmptyState } from '@/components/states';
import { Chip, ChipBar } from '@/ui/Chip';
import { Screen } from '@/ui/Screen';
import { TopBar } from '@/ui/TopBar';
import { SquadGroups } from '@/components/Squad';

/** Screen 12, Squad list: GK / DEF / MID / FWD with shirt number, known name, appearances and starts. */
export default function Squad() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const team = useTeam(id);
  const [season, setSeason] = useState<string | undefined>();
  const q = useTeamPlayers(id, season);
  const seasons = useMemo(() => team.data?.team.seasons ?? [], [team.data]);
  return (
    <Screen header={<TopBar title="Squad" sub={team.data?.team.name} />}>
      {seasons.length > 1 ? (
        <ChipBar style={{ marginBottom: 16 }}>
          <Chip label="All seasons" selected={!season} onPress={() => setSeason(undefined)} />
          {seasons.map((s) => (
            <Chip key={s.seasonId} label={`${s.competitionName} ${s.seasonName}`} selected={season === s.seasonId} onPress={() => setSeason(s.seasonId)} />
          ))}
        </ChipBar>
      ) : null}
      <QueryBoundary query={q} skeleton={<CardsSkeleton count={4} />} isEmpty={(d) => !d.players.length} empty={<EmptyState icon="group" title="No squad data" />}>
        {(d) => <SquadGroups players={d.players} />}
      </QueryBoundary>
    </Screen>
  );
}
