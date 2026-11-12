import { useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { makeScale, pitchSize, PITCH, ZONES, type Orientation, type PitchScale } from './scale';

export type ZoneOverlay = 'thirds' | 'halfSpaces' | 'zone14' | 'box' | 'lanes';

function Markings({ s, half }: { s: PitchScale; half: boolean }) {
  const { c } = useTheme();
  const L = c.pitchLine;
  const sw = 1.2;
  const p = s.pt;
  const rect = (x0: number, y0: number, x1: number, y1: number, key: string) => {
    const a = p(x0, y0);
    const b = p(x1, y1);
    return <Rect key={key} x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} stroke={L} strokeWidth={sw} fill="none" />;
  };
  const x0 = half ? PITCH.length / 2 : 0;
  const centre = p(52.5, 34);
  const r = s.m(ZONES.centreCircle);
  // Penalty arcs: the part of a 9.15 m circle around the spot outside the box.
  const arc = (spotX: number, dir: 1 | -1) => {
    // The arc meets the box edge 5.5 m from the spot (94 − 88.5).
    const ang = Math.acos((ZONES.penaltySpot - ZONES.box.x) / ZONES.centreCircle);
    const a1 = { x: spotX - dir * Math.cos(ang) * ZONES.centreCircle, y: 34 - Math.sin(ang) * ZONES.centreCircle };
    const a2 = { x: spotX - dir * Math.cos(ang) * ZONES.centreCircle, y: 34 + Math.sin(ang) * ZONES.centreCircle };
    const P1 = p(a1.x, a1.y);
    const P2 = p(a2.x, a2.y);
    // Bulges away from the goal: counter-clockwise for the attacking box, clockwise for the other.
    const sweep = dir === 1 ? 0 : 1;
    return <Path key={`arc${dir}`} d={`M ${P1.x} ${P1.y} A ${r} ${r} 0 0 ${sweep} ${P2.x} ${P2.y}`} stroke={L} strokeWidth={sw} fill="none" />;
  };
  return (
    <G>
      {rect(x0, 0, PITCH.length, PITCH.width, 'outline')}
      {!half ? (
        <>
          <Line x1={p(52.5, 0).x} y1={p(52.5, 0).y} x2={p(52.5, 68).x} y2={p(52.5, 68).y} stroke={L} strokeWidth={sw} />
          <Circle cx={centre.x} cy={centre.y} r={r} stroke={L} strokeWidth={sw} fill="none" />
          <Circle cx={centre.x} cy={centre.y} r={1.6} fill={L} />
          {rect(0, ZONES.box.y0, PITCH.length - ZONES.box.x, ZONES.box.y1, 'boxL')}
          {rect(0, ZONES.sixYard.y0, PITCH.length - ZONES.sixYard.x, ZONES.sixYard.y1, 'sixL')}
          <Circle cx={p(PITCH.length - ZONES.penaltySpot, 34).x} cy={p(PITCH.length - ZONES.penaltySpot, 34).y} r={1.4} fill={L} />
          {arc(PITCH.length - ZONES.penaltySpot, -1)}
        </>
      ) : (
        <Path
          d={`M ${p(52.5, 34 - ZONES.centreCircle).x} ${p(52.5, 34 - ZONES.centreCircle).y} A ${r} ${r} 0 0 1 ${p(52.5, 34 + ZONES.centreCircle).x} ${p(52.5, 34 + ZONES.centreCircle).y}`}
          stroke={L}
          strokeWidth={sw}
          fill="none"
        />
      )}
      {rect(ZONES.box.x, ZONES.box.y0, PITCH.length, ZONES.box.y1, 'boxR')}
      {rect(ZONES.sixYard.x, ZONES.sixYard.y0, PITCH.length, ZONES.sixYard.y1, 'sixR')}
      <Circle cx={p(ZONES.penaltySpot, 34).x} cy={p(ZONES.penaltySpot, 34).y} r={1.4} fill={L} />
      {arc(ZONES.penaltySpot, 1)}
      {/* goal */}
      {rect(PITCH.length, 30.34, PITCH.length + 1.2, 37.66, 'goalR')}
      {!half ? rect(-1.2, 30.34, 0, 37.66, 'goalL') : null}
    </G>
  );
}

function Overlays({ s, zones }: { s: PitchScale; zones: ZoneOverlay[] }) {
  const { c } = useTheme();
  const p = s.pt;
  const out: ReactNode[] = [];
  const band = (x0: number, y0: number, x1: number, y1: number, key: string, fill: string, stroke?: string, label?: string) => {
    const a = p(x0, y0);
    const b = p(x1, y1);
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    out.push(
      <G key={key}>
        <Rect x={x} y={y} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.2 : 0} strokeDasharray={stroke ? '4 3' : undefined} />
        {label ? (
          <SvgText x={x + 4} y={y + 12} fontSize={9.5} fontWeight="700" fill={c.muted} fontFamily="Inter_700Bold">
            {label}
          </SvgText>
        ) : null}
      </G>,
    );
  };
  if (zones.includes('thirds')) {
    for (const t of ZONES.thirds) {
      const a = p(t, 0);
      const b = p(t, 68);
      out.push(<Line key={`t${t}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c.pitchLine} strokeWidth={1} strokeDasharray="3 4" />);
    }
  }
  if (zones.includes('lanes')) {
    for (const l of ZONES.lanes) {
      const a = p(0, l);
      const b = p(105, l);
      out.push(<Line key={`l${l}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c.pitchLine} strokeWidth={0.8} strokeDasharray="2 5" />);
    }
  }
  if (zones.includes('halfSpaces')) ZONES.halfSpaces.forEach((h, i) => band(0, h.y0, 105, h.y1, `hs${i}`, c.pitchZone, undefined, i === 0 ? 'Half-space' : undefined));
  if (zones.includes('box')) band(ZONES.box.x, ZONES.box.y0, 105, ZONES.box.y1, 'boxz', c.pitchZone);
  if (zones.includes('zone14')) band(ZONES.zone14.x0, ZONES.zone14.y0, ZONES.zone14.x1, ZONES.zone14.y1, 'z14', c.limeSoft, c.name === 'dark' ? c.lime : c.limeDeep, 'Zone 14');
  return <G>{out}</G>;
}

/**
 * Flat pitch in thin lines; every team attacks left → right (landscape) or upwards (portrait).
 * `children` draws layers with the scale. `label` is the chart's text summary for screen readers.
 */
export function PitchCanvas({
  orientation = 'landscape',
  half = false,
  zones = [],
  children,
  label,
  style,
  maxHeight,
  showDirection = true,
}: {
  orientation?: Orientation;
  half?: boolean;
  zones?: ZoneOverlay[];
  children?: (s: PitchScale) => ReactNode;
  label: string;
  style?: StyleProp<ViewStyle>;
  maxHeight?: number;
  showDirection?: boolean;
}) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  let size = w ? pitchSize(w, orientation, 10, half) : null;
  if (size && maxHeight && size.height > maxHeight) size = { width: size.width, height: maxHeight };
  const s = size ? makeScale(size.width, size.height, orientation, 10, half) : null;
  return (
    <View
      onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[{ width: '100%' }, style]}>
      {s ? (
        <View style={{ borderRadius: 14, backgroundColor: c.pitchFill, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
          <Svg width={s.width} height={s.height}>
            <Overlays s={s} zones={zones} />
            <Markings s={s} half={half} />
            {children?.(s)}
          </Svg>
          {showDirection ? (
            <View
              pointerEvents="none"
              style={{ position: 'absolute', ...(orientation === 'landscape' ? { bottom: 4, left: 0, right: 0 } : { right: 4, top: 0, bottom: 0, justifyContent: 'center' }), alignItems: 'center' }}>
              <Svg width={orientation === 'landscape' ? 64 : 10} height={orientation === 'landscape' ? 10 : 64}>
                {orientation === 'landscape' ? (
                  <Path d="M2 5 H60 M54 1 L60 5 L54 9" stroke={c.muted} strokeWidth={1.2} fill="none" />
                ) : (
                  <Path d="M5 62 V4 M1 10 L5 4 L9 10" stroke={c.muted} strokeWidth={1.2} fill="none" />
                )}
              </Svg>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ aspectRatio: orientation === 'landscape' ? (half ? 52.5 / 68 : 105 / 68) : half ? 68 / 52.5 : 68 / 105, borderRadius: 14, backgroundColor: c.pitchFill }} />
      )}
    </View>
  );
}
