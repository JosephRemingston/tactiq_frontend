import { View } from 'react-native';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { T } from '@/ui/Text';

export type LegendKind = 'filled' | 'outlined' | 'goal' | 'saved' | 'off' | 'blocked' | 'post' | 'line';

function Glyph({ kind, color }: { kind: LegendKind; color: string }) {
  const { c } = useTheme();
  return (
    <Svg width={16} height={16}>
      {kind === 'filled' || kind === 'saved' ? <Circle cx={8} cy={8} r={5.5} fill={color} /> : null}
      {kind === 'outlined' ? <Circle cx={8} cy={8} r={5} fill="none" stroke={color} strokeWidth={2} /> : null}
      {kind === 'off' ? <Circle cx={8} cy={8} r={5} fill="none" stroke={color} strokeWidth={2} strokeDasharray="3 2" /> : null}
      {kind === 'goal' ? (
        <>
          <Circle cx={8} cy={8} r={6} fill={c.lime} stroke={c.name === 'dark' ? c.lime : '#4f6b00'} strokeWidth={1.5} />
          <Circle cx={8} cy={8} r={2} fill={c.onLime} />
        </>
      ) : null}
      {kind === 'blocked' ? <Rect x={3} y={3} width={10} height={10} fill="none" stroke={color} strokeWidth={2} /> : null}
      {kind === 'post' ? <Polygon points="8,2 14,13 2,13" fill="none" stroke={color} strokeWidth={2} /> : null}
      {kind === 'line' ? <Rect x={1} y={7} width={14} height={2.5} rx={1} fill={color} /> : null}
    </Svg>
  );
}

/** Chart legend: every entry has a distinct shape as well as colour. */
export function Legend({ items }: { items: { kind: LegendKind; label: string; color?: string }[] }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, rowGap: 8 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Glyph kind={it.kind} color={it.color ?? c.ink} />
          <T v="caption" color="inkSecondary">
            {it.label}
          </T>
        </View>
      ))}
    </View>
  );
}
