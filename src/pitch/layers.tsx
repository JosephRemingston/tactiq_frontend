import { Fragment, useEffect, useState } from 'react';
import { Circle, G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import type { FreezeFramePlayer, MatchEvent, NetworkEdge, NetworkNode, Shot } from '@/api/types';
import { useTheme } from '@/theme/ThemeProvider';
import { motion } from '@/theme/motion';
import { clampToPitch, nodeRadius, xgRadius, type PitchScale } from './scale';

export type Side = 'home' | 'away';

export function useSideColor() {
  const { c } = useTheme();
  return (side: Side) => (side === 'home' ? c.home : c.away);
}

/** Team dot: home filled, away outlined (never colour alone). Larger invisible hit area. */
export function Dot({
  s,
  x,
  y,
  side,
  r = 5,
  onPress,
  highlight,
  label,
}: {
  s: PitchScale;
  x: number;
  y: number;
  side: Side;
  r?: number;
  onPress?: () => void;
  highlight?: boolean;
  label?: string;
}) {
  const { c } = useTheme();
  const col = useSideColor()(side);
  const p = s.pt(clampToPitch(x, y).x, clampToPitch(x, y).y);
  return (
    <G onPress={onPress}>
      {highlight ? <Circle cx={p.x} cy={p.y} r={r + 5} fill="none" stroke={c.name === 'dark' ? c.lime : c.ink} strokeWidth={2} /> : null}
      <Circle cx={p.x} cy={p.y} r={r} fill={side === 'home' ? col : c.pitchFill} stroke={col} strokeWidth={side === 'home' ? 0 : 2} />
      {label ? (
        <SvgText x={p.x} y={p.y + 3.2} fontSize={Math.max(8, r * 0.85)} fontWeight="700" textAnchor="middle" fill={side === 'home' ? '#ffffff' : col} fontFamily="Inter_700Bold">
          {label}
        </SvgText>
      ) : null}
      {onPress ? <Circle cx={p.x} cy={p.y} r={Math.max(r, 22)} fill="transparent" /> : null}
    </G>
  );
}

/** Arrow between two points (pass, carry). */
export function Arrow({ s, x, y, endX, endY, side, dashed, width = 1.8, opacity = 1 }: { s: PitchScale; x: number; y: number; endX: number; endY: number; side: Side; dashed?: boolean; width?: number; opacity?: number }) {
  const col = useSideColor()(side);
  const a = s.pt(x, y);
  const b = s.pt(endX, endY);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const h = 6;
  const p1 = { x: b.x - h * Math.cos(ang - 0.45), y: b.y - h * Math.sin(ang - 0.45) };
  const p2 = { x: b.x - h * Math.cos(ang + 0.45), y: b.y - h * Math.sin(ang + 0.45) };
  return (
    <G opacity={opacity}>
      <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={col} strokeWidth={width} strokeDasharray={dashed ? '4 3' : undefined} strokeLinecap="round" />
      <Polygon points={`${b.x},${b.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill={col} />
    </G>
  );
}

/** Passing network: nodes at average positions sized by passes, edges weighted by count. */
export function NetworkLayer({
  s,
  nodes,
  edges,
  side,
  selected,
  onSelect,
  minEdge = 3,
  jersey,
}: {
  s: PitchScale;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  side: Side;
  selected?: string | null;
  onSelect?: (id: string) => void;
  minEdge?: number;
  jersey?: Map<string, number | null>;
}) {
  const { c } = useTheme();
  const col = useSideColor()(side);
  const byId = new Map(nodes.map((n) => [n.playerId, n]));
  const maxP = Math.max(1, ...nodes.map((n) => n.passes));
  const maxE = Math.max(1, ...edges.map((e) => e.count));
  const shown = edges.filter((e) => e.count >= minEdge && byId.has(e.from) && byId.has(e.to));
  return (
    <G>
      {shown.map((e) => {
        const a = byId.get(e.from)!;
        const b = byId.get(e.to)!;
        const pa = s.pt(a.x, a.y);
        const pb = s.pt(b.x, b.y);
        const involved = !selected || selected === e.from || selected === e.to;
        return (
          <Line
            key={`${e.from}-${e.to}`}
            x1={pa.x}
            y1={pa.y}
            x2={pb.x}
            y2={pb.y}
            stroke={col}
            strokeWidth={0.8 + 5 * (e.count / maxE)}
            strokeLinecap="round"
            opacity={involved ? 0.25 + 0.55 * (e.count / maxE) : 0.07}
          />
        );
      })}
      {nodes.map((n) => {
        const p = s.pt(n.x, n.y);
        const r = nodeRadius(n.passes, maxP);
        const isSel = selected === n.playerId;
        const dim = selected && !isSel;
        return (
          <G key={n.playerId} onPress={onSelect ? () => onSelect(n.playerId) : undefined} opacity={dim ? 0.45 : 1}>
            {isSel ? <Circle cx={p.x} cy={p.y} r={r + 5} fill="none" stroke={c.name === 'dark' ? c.lime : c.ink} strokeWidth={2.2} /> : null}
            <Circle cx={p.x} cy={p.y} r={r} fill={side === 'home' ? col : c.pitchFill} stroke={col} strokeWidth={side === 'home' ? 1.5 : 2.4} />
            <SvgText x={p.x} y={p.y + 3.5} fontSize={10} fontWeight="700" textAnchor="middle" fill={side === 'home' ? '#ffffff' : col} fontFamily="Inter_700Bold">
              {jersey?.get(n.playerId) ?? n.name.split(' ').slice(-1)[0].slice(0, 3)}
            </SvgText>
            {onSelect ? <Circle cx={p.x} cy={p.y} r={Math.max(r, 22)} fill="transparent" /> : null}
          </G>
        );
      })}
    </G>
  );
}

export const OUTCOME: Record<string, { label: string; icon: string }> = {
  goal: { label: 'Goal', icon: 'sports_soccer' },
  saved: { label: 'Saved', icon: 'back_hand' },
  saved_to_post: { label: 'Saved', icon: 'back_hand' },
  saved_off_target: { label: 'Saved', icon: 'back_hand' },
  off_target: { label: 'Off target', icon: 'block' },
  off_t: { label: 'Off target', icon: 'block' },
  wayward: { label: 'Off target', icon: 'block' },
  blocked: { label: 'Blocked', icon: 'shield' },
  post: { label: 'Post', icon: 'vertical_align_center' },
};
export function outcomeKey(o: string | null): 'goal' | 'saved' | 'off' | 'blocked' | 'post' {
  if (!o) return 'off';
  if (o === 'goal') return 'goal';
  if (o.startsWith('saved')) return 'saved';
  if (o === 'blocked') return 'blocked';
  if (o === 'post') return 'post';
  return 'off';
}

/** Shot marker: size = xG; outcome by shape AND colour (goal ★ ring, saved filled, off target hollow, blocked square, post triangle). */
export function ShotMarker({ s, shot, side, selected, onPress }: { s: PitchScale; shot: Pick<Shot, 'x' | 'y' | 'xg' | 'outcome'>; side: Side; selected?: boolean; onPress?: () => void }) {
  const { c } = useTheme();
  const col = useSideColor()(side);
  const p = s.pt(clampToPitch(shot.x, shot.y).x, clampToPitch(shot.x, shot.y).y);
  const r = xgRadius(shot.xg);
  const k = outcomeKey(shot.outcome);
  const accent = c.name === 'dark' ? c.lime : c.ink;
  return (
    <G onPress={onPress}>
      {selected ? <Circle cx={p.x} cy={p.y} r={r + 6} fill="none" stroke={accent} strokeWidth={2} /> : null}
      {k === 'goal' ? (
        <>
          <Circle cx={p.x} cy={p.y} r={r} fill={c.lime} stroke={c.name === 'dark' ? c.lime : '#4f6b00'} strokeWidth={2} />
          <Circle cx={p.x} cy={p.y} r={Math.max(2, r * 0.35)} fill={c.onLime} />
        </>
      ) : k === 'saved' ? (
        <Circle cx={p.x} cy={p.y} r={r} fill={col} fillOpacity={0.85} stroke={col} strokeWidth={1.5} />
      ) : k === 'blocked' ? (
        <Rect x={p.x - r * 0.85} y={p.y - r * 0.85} width={r * 1.7} height={r * 1.7} fill="none" stroke={col} strokeWidth={2} />
      ) : k === 'post' ? (
        <Polygon points={`${p.x},${p.y - r} ${p.x + r},${p.y + r * 0.8} ${p.x - r},${p.y + r * 0.8}`} fill="none" stroke={col} strokeWidth={2} />
      ) : (
        <Circle cx={p.x} cy={p.y} r={r} fill="none" stroke={col} strokeWidth={2} strokeDasharray="3 2" />
      )}
      {onPress ? <Circle cx={p.x} cy={p.y} r={Math.max(r, 20)} fill="transparent" /> : null}
    </G>
  );
}

/** Freeze frame: player positions at the moment of a shot, plus the shot line to goal. */
export function FreezeFrameLayer({ s, frame, shooter, side }: { s: PitchScale; frame: FreezeFramePlayer[]; shooter: { x: number; y: number }; side: Side }) {
  const { c } = useTheme();
  const own = useSideColor()(side);
  const opp = useSideColor()(side === 'home' ? 'away' : 'home');
  const sp = s.pt(shooter.x, shooter.y);
  const g1 = s.pt(105, 30.34);
  const g2 = s.pt(105, 37.66);
  return (
    <G>
      <Polygon points={`${sp.x},${sp.y} ${g1.x},${g1.y} ${g2.x},${g2.y}`} fill={c.limeSoft} stroke={c.name === 'dark' ? c.lime : c.limeDeep} strokeWidth={1} />
      {frame.map((f, i) => {
        const p = s.pt(clampToPitch(f.x, f.y).x, clampToPitch(f.x, f.y).y);
        const gk = /goalkeeper/i.test(f.positionName ?? '');
        return f.teammate ? (
          <Circle key={i} cx={p.x} cy={p.y} r={5} fill={own} />
        ) : (
          <G key={i}>
            <Circle cx={p.x} cy={p.y} r={5} fill={c.pitchFill} stroke={opp} strokeWidth={2} />
            {gk ? <Circle cx={p.x} cy={p.y} r={8.5} fill="none" stroke={opp} strokeWidth={1} /> : null}
          </G>
        );
      })}
      <Circle cx={sp.x} cy={sp.y} r={7} fill={c.lime} stroke={c.name === 'dark' ? c.lime : c.ink} strokeWidth={1.5} />
    </G>
  );
}

/** Defensive action height: a vertical line at the average height with a label. */
export function DefensiveHeightLayer({ s, height, side, label }: { s: PitchScale; height: number; side: Side; label: string }) {
  const { c } = useTheme();
  const col = useSideColor()(side);
  const a = s.pt(height, 0);
  const b = s.pt(height, 68);
  const own = s.pt(0, 0);
  return (
    <G>
      <Rect
        x={s.orientation === 'landscape' ? own.x : a.x}
        y={s.orientation === 'landscape' ? a.y : a.y}
        width={s.orientation === 'landscape' ? a.x - own.x : b.x - a.x}
        height={s.orientation === 'landscape' ? b.y - a.y : own.y - a.y}
        fill={col}
        opacity={0.08}
      />
      <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={col} strokeWidth={2.5} strokeDasharray="6 4" />
      <SvgText x={a.x + 5} y={a.y + 14} fontSize={10.5} fontWeight="700" fill={c.ink} fontFamily="Inter_700Bold">
        {label}
      </SvgText>
    </G>
  );
}

/** Possession chain replay: arrows drawn one by one within 600 ms (instant under reduced motion). */
export function ChainLayer({ s, events, side, replayKey }: { s: PitchScale; events: MatchEvent[]; side: Side; replayKey: string | number }) {
  const { reduceMotion } = useTheme();
  const moves = events.filter((e) => e.x !== null && e.y !== null && (e.type === 'pass' || e.type === 'carry' || e.type === 'shot'));
  // The parent keys this layer by replayKey, so each replay starts from a fresh state.
  const [n, setN] = useState(reduceMotion ? moves.length : 0);
  useEffect(() => {
    if (reduceMotion) return;
    const step = Math.max(30, Math.floor(motion.replayMax / Math.max(1, moves.length)));
    let i = 0;
    const t = setInterval(() => {
      i++;
      setN(i);
      if (i >= moves.length) clearInterval(t);
    }, step);
    return () => clearInterval(t);
  }, [replayKey, reduceMotion, moves.length]);
  const first = moves[0];
  return (
    <G>
      {first ? <Dot s={s} x={first.x!} y={first.y!} side={side} r={4} /> : null}
      {moves.slice(0, n).map((e) => {
        const endX = e.endX ?? (e.type === 'shot' ? 105 : e.x!);
        const endY = e.endY ?? (e.type === 'shot' ? 34 : e.y!);
        return (
          <Fragment key={e.id}>
            <Arrow s={s} x={e.x!} y={e.y!} endX={endX} endY={endY} side={side} dashed={e.type === 'carry'} width={e.type === 'shot' ? 2.6 : 1.8} />
          </Fragment>
        );
      })}
    </G>
  );
}
