import { router } from 'expo-router';
import { View } from 'react-native';

import type { SquadPlayer } from '@/api/types';
import { Card } from '@/ui/Card';
import { Divider, Stack } from '@/ui/bits';
import { T } from '@/ui/Text';
import { SquadRow } from './rows';

export const GROUPS: { key: SquadPlayer['positionGroup']; label: string }[] = [
  { key: 'GK', label: 'Goalkeepers' },
  { key: 'DEF', label: 'Defenders' },
  { key: 'MID', label: 'Midfielders' },
  { key: 'FWD', label: 'Forwards' },
  { key: null, label: 'Position unknown' },
];

export function SquadGroups({ players, limit }: { players: SquadPlayer[]; limit?: number }) {
  const grouped = GROUPS.map((g) => ({ ...g, players: players.filter((p) => p.positionGroup === g.key).sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99)) })).filter((g) => g.players.length);
  return (
    <Stack gap={18}>
      {grouped.map((g) => (
        <View key={g.label}>
          <T v="eyebrow" color="muted" style={{ marginBottom: 4 }}>
            {g.label} · {g.players.length}
          </T>
          <Card padded={false} style={{ paddingHorizontal: 16 }}>
            {g.players.slice(0, limit).map((p, i) => (
              <View key={`${p.id}:${p.seasonId}`}>
                {i > 0 ? <Divider inset={48} /> : null}
                <SquadRow p={p} onPress={() => router.push(`/player/${p.id}`)} />
              </View>
            ))}
          </Card>
        </View>
      ))}
    </Stack>
  );
}

