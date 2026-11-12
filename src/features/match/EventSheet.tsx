import { View } from 'react-native';

import type { MatchEvent } from '@/api/types';
import { fmtNum, PERIOD_LABEL } from '@/lib/format';
import { Legend } from '@/pitch/Legend';
import { PitchCanvas } from '@/pitch/PitchCanvas';
import { Arrow, Dot, FreezeFrameLayer } from '@/pitch/layers';
import { useTheme } from '@/theme/ThemeProvider';
import { Row, Stack } from '@/ui/bits';
import { Tag } from '@/ui/Pill';
import { T } from '@/ui/Text';
import { describe } from './events';

const human = (s: string | undefined | null) => (s ? s.replace(/_/g, ' ') : '—');

/** Event details on a mini pitch: location and end point; shots show the freeze frame. */
export function EventSheet({ e, side, names }: { e: MatchEvent; side: 'home' | 'away'; names: Map<string, string> }) {
  const { c } = useTheme();
  const isShot = e.type === 'shot';
  const ff = isShot ? (e.detail.freezeFrame ?? []) : [];
  const has = e.x !== null && e.y !== null;
  const summary = `${describe(e, names)}. ${e.minute}th minute, ${PERIOD_LABEL[e.period] ?? ''}.`;
  return (
    <Stack gap={14}>
      <T v="titleSm">{describe(e, names)}</T>
      <Row gap={8} wrap>
        <Tag size="sm" icon="schedule">{`${e.minute}′ · ${PERIOD_LABEL[e.period] ?? `Period ${e.period}`}`}</Tag>
        {e.underPressure ? (
          <Tag size="sm" icon="compress">
            Under pressure
          </Tag>
        ) : null}
        {e.playPattern ? <Tag size="sm">{human(e.playPattern)}</Tag> : null}
      </Row>
      {has ? (
        <PitchCanvas label={`Pitch showing where it happened. ${summary}${ff.length ? ` ${ff.length} players shown at the moment of the shot.` : ''}`} zones={isShot ? ['box'] : []}>
          {(s) => (
            <>
              {ff.length ? <FreezeFrameLayer s={s} frame={ff} shooter={{ x: e.x!, y: e.y! }} side={side} /> : null}
              {!ff.length && e.endX !== null && e.endY !== null ? <Arrow s={s} x={e.x!} y={e.y!} endX={e.endX} endY={e.endY} side={side} dashed={e.type === 'carry'} /> : null}
              {!ff.length ? <Dot s={s} x={e.x!} y={e.y!} side={side} r={6} highlight /> : null}
            </>
          )}
        </PitchCanvas>
      ) : (
        <T v="bodySm" color="muted">
          This event has no location.
        </T>
      )}
      {ff.length ? (
        <Legend
          items={[
            { kind: 'goal', label: 'Shooter' },
            { kind: 'filled', label: 'Team-mates', color: side === 'home' ? c.home : c.away },
            { kind: 'outlined', label: 'Opponents', color: side === 'home' ? c.away : c.home },
          ]}
        />
      ) : null}
      {isShot ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {[
            ['xG', fmtNum(e.detail.xg ?? null, 2)],
            ['Outcome', human(e.outcome)],
            ['Body part', human(e.detail.bodyPart)],
            ['Technique', human(e.detail.technique)],
            ['Type', human(e.detail.shotType)],
          ].map(([k, v]) => (
            <View key={k} style={{ minWidth: 90 }}>
              <T v="caption" color="muted">
                {k}
              </T>
              <T v="label" num>
                {v}
              </T>
            </View>
          ))}
        </View>
      ) : null}
      {isShot && !ff.length ? (
        <T v="caption" color="muted">
          No freeze frame for this shot (penalties and some moments don't have one).
        </T>
      ) : null}
    </Stack>
  );
}
