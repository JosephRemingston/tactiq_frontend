import { guardParams } from '@/components/ParamGuard';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAllEvents, useMetrics } from '@/api/hooks';
import type { MatchDetail, Shot } from '@/api/types';
import { ChartFrame } from '@/components/ChartFrame';
import { CoverageBadge } from '@/components/badges';
import { QueryBoundary } from '@/components/QueryBoundary';
import { AnalysisScreen, AnalysisSkeleton, useMatchParam } from '@/features/analysis/AnalysisScreen';
import { useMatchCtx } from '@/features/match/context';
import { fmtNum, PERIOD_LABEL } from '@/lib/format';
import { Legend } from '@/pitch/Legend';
import { FreezeFrameLayer, OUTCOME, ShotMarker } from '@/pitch/layers';
import { PitchCanvas } from '@/pitch/PitchCanvas';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { Row, Stack } from '@/ui/bits';
import { Segmented } from '@/ui/Segmented';
import { T } from '@/ui/Text';

type TeamShot = Shot & { teamId: string };
const human = (s: string | null | undefined) => (s ? s.replace(/_/g, ' ') : '—');

function useShots(match: MatchDetail) {
  const q = useMetrics(match.id, { keys: ['shooting.shot_map'], playerId: 'none', scope: 'full' }, true);
  const shots = useMemo<TeamShot[]>(
    () =>
      (q.data?.metrics ?? [])
        .filter((m) => m.key === 'shooting.shot_map' && m.scope === 'full')
        .flatMap((m) => ((m.valueJson as { shots?: Shot[] } | undefined)?.shots ?? []).map((s) => ({ ...s, teamId: m.teamId ?? '' }))),
    [q.data],
  );
  return { q, shots };
}

function Detail({ match, shot }: { match: MatchDetail; shot: TeamShot }) {
  const { c } = useTheme();
  const { sideOf, nameOf } = useMatchCtx();
  const events = useAllEvents(match.id);
  const ev = events.data?.find((e) => e.id === shot.eventId);
  const ff = ev?.detail.freezeFrame ?? [];
  const side = sideOf(shot.teamId) ?? 'home';
  return (
    <Card>
      <Row>
        <T v="titleSm" style={{ flex: 1 }}>
          {shot.playerName ?? 'Shot'} · {shot.minute}′
        </T>
        <T v="caption" color="muted">
          {nameOf(shot.teamId)}
        </T>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
        {[
          ['xG', fmtNum(shot.xg, 2)],
          ['Outcome', OUTCOME[shot.outcome]?.label ?? human(shot.outcome)],
          ['Body part', human(shot.bodyPart)],
          ['Technique', human(ev?.detail.technique as string | undefined)],
          ['Type', human(shot.shotType)],
          ['Period', PERIOD_LABEL[shot.period] ?? String(shot.period)],
        ].map(([k, v]) => (
          <View key={k} style={{ minWidth: 92 }}>
            <T v="caption" color="muted">
              {k}
            </T>
            <T v="label" num>
              {v}
            </T>
          </View>
        ))}
      </View>
      {ff.length ? (
        <View style={{ marginTop: 14, gap: 8 }}>
          <T v="labelSm">Freeze frame: everyone's position at the moment of the shot</T>
          <PitchCanvas half label={`Freeze frame for ${shot.playerName}'s shot: ${ff.filter((f) => f.teammate).length} team-mates and ${ff.filter((f) => !f.teammate).length} opponents shown.`} zones={['box']}>
            {(s) => <FreezeFrameLayer s={s} frame={ff} shooter={{ x: shot.x, y: shot.y }} side={side} />}
          </PitchCanvas>
          <Legend
            items={[
              { kind: 'goal', label: 'Shooter' },
              { kind: 'filled', label: 'Team-mates', color: side === 'home' ? c.home : c.away },
              { kind: 'outlined', label: 'Opponents', color: side === 'home' ? c.away : c.home },
            ]}
          />
        </View>
      ) : (
        <T v="caption" color="muted" style={{ marginTop: 12 }}>
          {events.isLoading ? 'Loading the freeze frame…' : 'No freeze frame for this shot.'}
        </T>
      )}
    </Card>
  );
}

type Sel = { team: string; sel: string | null };

function Main({ match, state, set }: { match: MatchDetail; state: Sel; set: (s: Sel) => void }) {
  const { c } = useTheme();
  const { sideOf, nameOf } = useMatchCtx();
  const { q, shots } = useShots(match);
  const { team, sel } = state;
  const setTeam = (t: string) => set({ team: t, sel: null });
  const setSel = (id: string | null) => set({ team, sel: id });
  const shown = shots.filter((s) => (team === 'both' || s.teamId === team) && s.period !== 5);
  const shootout = shots.filter((s) => s.period === 5).length;
  const sum = (id: string) => shots.filter((s) => s.teamId === id && s.period !== 5);
  const take = [match.home, match.away]
    .map((t) => {
      const list = sum(t.id);
      const xg = list.reduce((a, s) => a + (s.xg ?? 0), 0);
      return `${t.name} ${list.length} shots, ${fmtNum(xg, 2)} xG`;
    })
    .join('; ');
  const selected = shots.find((s) => s.eventId === sel);
  return (
    <Stack gap={16}>
      <Segmented
        label="Team"
        value={team}
        onChange={setTeam}
        options={[
          { value: 'both', label: 'Both' },
          { value: match.home.id, label: match.home.name },
          { value: match.away.id, label: match.away.name },
        ]}
      />
      <QueryBoundary query={q} skeleton={<AnalysisSkeleton />} allowForced={[]}>
        {() => (
          <ChartFrame
            takeaway={`${take}.`}
            swapKey={team}
            table={{
              columns: ['Shot', 'Min', 'xG'],
              rows: shown.sort((a, b) => a.minute - b.minute).map((s) => [`${s.playerName ?? '—'} (${OUTCOME[s.outcome]?.label ?? human(s.outcome)})`, `${s.minute}′`, fmtNum(s.xg, 2)]),
            }}
            footer={
              <Stack gap={8}>
                <Legend
                  items={[
                    { kind: 'goal', label: 'Goal' },
                    { kind: 'saved', label: 'Saved', color: c.ink },
                    { kind: 'off', label: 'Off target', color: c.ink },
                    { kind: 'blocked', label: 'Blocked', color: c.ink },
                    { kind: 'post', label: 'Post', color: c.ink },
                  ]}
                />
                <Row gap={8} wrap>
                  <CoverageBadge label="observed" />
                  <T v="caption" color="muted" style={{ flex: 1 }}>
                    Bigger marker = better chance (xG). Blue is {match.home.name}, orange {match.away.name}. Each team attacks to the right.
                    {shootout ? ` ${shootout} shoot-out kicks are not shown.` : ''}
                  </T>
                </Row>
              </Stack>
            }>
            <PitchCanvas half label={`Shot map. ${take}.`} zones={['box']}>
              {(s) =>
                shown.map((sh) => (
                  <ShotMarker key={sh.eventId} s={s} shot={sh} side={sideOf(sh.teamId) ?? 'home'} selected={sel === sh.eventId} onPress={() => setSel(sel === sh.eventId ? null : sh.eventId)} />
                ))
              }
            </PitchCanvas>
          </ChartFrame>
        )}
      </QueryBoundary>
      {selected ? null : (
        <T v="caption" color="muted">
          Tap a shot for its xG, body part, technique and freeze frame. Showing {shown.length} of {shots.length - shootout} shots{team !== 'both' ? ` by ${nameOf(team)}` : ''}.
        </T>
      )}
    </Stack>
  );
}

function Side({ match, sel }: { match: MatchDetail; sel: string | null }) {
  const { shots } = useShots(match);
  // Default to the best open-play chance: penalties have no freeze frame and say little about play.
  const best = useMemo(() => [...shots].filter((x) => x.period !== 5 && x.shotType !== 'penalty').sort((a, b) => (b.xg ?? 0) - (a.xg ?? 0))[0], [shots]);
  const s = shots.find((x) => x.eventId === sel) ?? best;
  if (!s) return null;
  return (
    <Stack gap={8}>
      <T v="eyebrow" color="muted">
        {sel ? 'Selected shot' : 'Best open-play chance'}
      </T>
      <Detail match={match} shot={s} />
    </Stack>
  );
}

/** Screen 24, Shot map. Tablet: pitch and the selected shot side by side; phone: detail below. */
function ShotMapView() {
  const p = useMatchParam();
  const [state, setState] = useState<Sel>({ team: p.teamId ?? 'both', sel: null });
  return (
    <AnalysisScreen title="Shot map" side={(m) => <Side match={m} sel={state.sel} />}>
      {(m) => <Main match={m} state={state} set={setState} />}
    </AnalysisScreen>
  );
}

// Ids from the route are validated before the screen mounts (deep links are untrusted).
export default guardParams({ matchId: 'uuid', teamId: 'uuid?' }, ShotMapView);
