import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { T } from '@/ui/Text';

/** Grouped bars: one group per label, home solid and away outlined. */
export function BarGroup({ groups, homeName, awayName, unit = '' }: { groups: { label: string; home: number; away: number }[]; homeName: string; awayName: string; unit?: string }) {
  const { c } = useTheme();
  const max = Math.max(1, ...groups.flatMap((g) => [g.home, g.away]));
  const H = 120;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 18, height: H + 40 }}>
      {groups.map((g) => (
        <View key={g.label} style={{ flex: 1, alignItems: 'center' }} accessible accessibilityLabel={`${g.label}: ${homeName} ${g.home}${unit}, ${awayName} ${g.away}${unit}`}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: H }}>
            {(['home', 'away'] as const).map((side) => {
              const v = g[side];
              return (
                <View key={side} style={{ alignItems: 'center', justifyContent: 'flex-end', height: H }}>
                  <T v="caption" num style={{ marginBottom: 3 }}>
                    {v}
                    {unit}
                  </T>
                  <View
                    style={{
                      width: 22,
                      height: Math.max(2, (v / max) * (H - 20)),
                      borderRadius: 6,
                      backgroundColor: side === 'home' ? c.home : c.awaySoft,
                      borderWidth: side === 'away' ? 2 : 0,
                      borderColor: c.away,
                    }}
                  />
                </View>
              );
            })}
          </View>
          <T v="caption" color="muted" style={{ marginTop: 6 }}>
            {g.label}
          </T>
        </View>
      ))}
    </View>
  );
}

const FEATURE_LABEL: Record<string, string> = {
  xt: 'Threat added',
  npxg: 'Chance quality',
  shots: 'Shots',
  mean_x: 'How high',
  passes: 'Passes',
  aerials: 'Aerials',
  crosses: 'Crosses',
  pressures: 'Pressures',
  key_passes: 'Key passes',
  mean_abs_y: 'How wide',
  recoveries: 'Recoveries',
  box_touches: 'Box touches',
  prog_passes: 'Progressive passes',
  prog_carries: 'Progressive carries',
  mean_pass_length: 'Pass length',
  final_third_touches: 'Final-third touches',
  tackles_interceptions: 'Tackles + interceptions',
};
export const featureLabel = (k: string) => FEATURE_LABEL[k] ?? k.replace(/_/g, ' ');

/**
 * Radar of z-scores (−2.5 … +2.5) against the reference group. The 0 ring is "typical".
 * Points are labelled; tapping a point shows its value.
 */
export function Radar({ z, keys, size = 300 }: { z: Record<string, number>; keys: string[]; size?: number }) {
  const { c } = useTheme();
  const [sel, setSel] = useState<string | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 48;
  const clamp = (v: number) => Math.max(-2.5, Math.min(2.5, v));
  const rOf = (v: number) => ((clamp(v) + 2.5) / 5) * R;
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / keys.length) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };
  const poly = keys.map((k, i) => pt(i, rOf(z[k] ?? 0))).map((p) => `${p.x},${p.y}`).join(' ');
  const ring = (v: number) => keys.map((_, i) => pt(i, rOf(v))).map((p) => `${p.x},${p.y}`).join(' ');
  const accent = c.name === 'dark' ? c.lime : c.ink;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {[-2, 0, 2].map((v) => (
          <Polygon key={v} points={ring(v)} fill="none" stroke={c.pitchLine} strokeWidth={v === 0 ? 1.4 : 0.8} strokeDasharray={v === 0 ? undefined : '3 3'} />
        ))}
        {keys.map((k, i) => {
          const o = pt(i, R);
          return <Line key={k} x1={cx} y1={cy} x2={o.x} y2={o.y} stroke={c.pitchLine} strokeWidth={0.6} />;
        })}
        <Polygon points={poly} fill={c.limeSoft} stroke={accent} strokeWidth={2} />
        {keys.map((k, i) => {
          const p = pt(i, rOf(z[k] ?? 0));
          const l = pt(i, R + 22);
          return (
            <G key={k} onPress={() => setSel(sel === k ? null : k)}>
              <Circle cx={p.x} cy={p.y} r={sel === k ? 6 : 4} fill={accent} />
              <Circle cx={p.x} cy={p.y} r={18} fill="transparent" />
              <SvgText x={l.x} y={l.y + 3} fontSize={9.5} fontWeight="600" textAnchor="middle" fill={c.inkSecondary} fontFamily="Inter_600SemiBold">
                {featureLabel(k).length > 14 ? `${featureLabel(k).slice(0, 13)}…` : featureLabel(k)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      <T v="caption" color="muted" align="center" style={{ minHeight: 18 }}>
        {sel ? `${featureLabel(sel)}: ${z[sel] >= 0 ? '+' : ''}${(z[sel] ?? 0).toFixed(2)} SD from the reference group` : 'Solid ring = typical for the reference group. Tap a point.'}
      </T>
    </View>
  );
}
