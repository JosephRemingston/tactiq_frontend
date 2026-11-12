import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { LineupPlayer, SquadPlayer } from '@/api/types';
import { displayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '@/ui/Icon';
import { Lift } from '@/ui/motion';
import { Tag } from '@/ui/Pill';
import { T } from '@/ui/Text';

/** Generic list row: leading visual, title, subtitle, trailing. 56dp minimum. */
export function ListRow({
  leading,
  title,
  sub,
  trailing,
  onPress,
  accessibilityLabel,
  chevron = !!onPress,
}: {
  leading?: ReactNode;
  title: string;
  sub?: string | null;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  chevron?: boolean;
}) {
  const { c } = useTheme();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingVertical: 8 }}>
      {leading}
      <View style={{ flex: 1 }}>
        <T v="titleSm" numberOfLines={2}>
          {title}
        </T>
        {sub ? (
          <T v="caption" color="muted" numberOfLines={2} style={{ marginTop: 2 }}>
            {sub}
          </T>
        ) : null}
      </View>
      {trailing}
      {chevron ? <Icon name="chevron_right" size={22} color={c.muted} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Lift kind="none" onPress={onPress} accessibilityLabel={accessibilityLabel ?? [title, sub].filter(Boolean).join(', ')}>
      {body}
    </Lift>
  );
}

export function IconTile({ icon, tone = 'neutral' }: { icon: string; tone?: 'neutral' | 'lime' | 'hero' }) {
  const { c } = useTheme();
  const bg = tone === 'lime' ? c.lime : tone === 'hero' ? c.hero : c.surfaceHigh;
  const fg = tone === 'lime' ? c.onLime : tone === 'hero' ? '#f2f5f6' : c.ink;
  return (
    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={21} color={fg} />
    </View>
  );
}

function Shirt({ n }: { n: number | null }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
      <T v="labelSm" num>
        {n ?? '–'}
      </T>
    </View>
  );
}

/** Player row: shirt number, known name, position, minutes, cards and sub icons. */
export function PlayerRow({ p, onPress, fullTime }: { p: LineupPlayer; onPress?: () => void; fullTime?: number }) {
  const { c } = useTheme();
  const subbedOn = !p.isStarter && p.minuteOn !== null;
  const subbedOff = p.minuteOff !== null && fullTime !== undefined && p.minuteOff < fullTime;
  // minuteOff is empty for players still on at the end, so they count to full time.
  const mins = p.minuteOn !== null ? Math.max(0, (p.minuteOff ?? fullTime ?? 90) - p.minuteOn) : null;
  const yellow = p.cards.filter((x) => /yellow/i.test(x.type) && !/second/i.test(x.type));
  const red = p.cards.filter((x) => /red/i.test(x.type));
  const label = `${p.jerseyNumber ?? ''} ${displayName(p)}, ${p.positionName ?? ''}${mins !== null ? `, ${mins} minutes` : ', unused'}${subbedOn ? `, came on in minute ${p.minuteOn}` : ''}${subbedOff ? `, went off in minute ${p.minuteOff}` : ''}${yellow.length ? ', yellow card' : ''}${red.length ? ', red card' : ''}`;
  return (
    <ListRow
      leading={<Shirt n={p.jerseyNumber} />}
      title={displayName(p)}
      sub={[p.positionName, mins !== null ? `${mins}′` : 'Unused'].filter(Boolean).join(' · ')}
      onPress={onPress}
      accessibilityLabel={label}
      trailing={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {subbedOn ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="arrow_upward" size={16} color={c.success} />
              <T v="caption" color="success" num>
                {p.minuteOn}′
              </T>
            </View>
          ) : null}
          {subbedOff ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="arrow_downward" size={16} color={c.error} />
              <T v="caption" color="error" num>
                {p.minuteOff}′
              </T>
            </View>
          ) : null}
          {yellow.map((_, i) => (
            <View key={`y${i}`} style={{ width: 11, height: 15, borderRadius: 2, backgroundColor: '#f2c81b' }} accessibilityLabel="Yellow card" />
          ))}
          {red.map((_, i) => (
            <View key={`r${i}`} style={{ width: 11, height: 15, borderRadius: 2, backgroundColor: '#d92d20' }} accessibilityLabel="Red card" />
          ))}
        </View>
      }
    />
  );
}

export function SquadRow({ p, onPress }: { p: SquadPlayer; onPress?: () => void }) {
  return (
    <ListRow
      leading={<Shirt n={p.jerseyNumber} />}
      title={displayName(p)}
      sub={`${p.appearances} ${p.appearances === 1 ? 'appearance' : 'appearances'} · ${p.starts} ${p.starts === 1 ? 'start' : 'starts'}`}
      onPress={onPress}
      trailing={p.positionGroup ? <Tag size="sm">{p.positionGroup}</Tag> : null}
    />
  );
}
