import type { Lineup, MatchEvent } from '@/api/types';
import { fmtNum } from '@/lib/format';

export const EVENT_ICON: Record<string, string> = {
  pass: 'arrow_right_alt',
  carry: 'directions_run',
  ball_receipt: 'call_received',
  shot: 'sports_soccer',
  pressure: 'compress',
  duel: 'sports_kabaddi',
  dribble: 'moving',
  dribbled_past: 'call_missed',
  interception: 'front_hand',
  clearance: 'north_east',
  block: 'shield',
  ball_recovery: 'restart_alt',
  dispossessed: 'remove_circle',
  miscontrol: 'error',
  foul_committed: 'gavel',
  foul_won: 'flag',
  offside: 'flag',
  goalkeeper: 'back_hand',
  substitution: 'swap_vert',
  tactical_shift: 'grid_view',
  starting_xi: 'groups',
  half_start: 'play_circle',
  half_end: 'stop_circle',
  injury_stoppage: 'medical_services',
  bad_behaviour: 'style',
  own_goal_for: 'sports_soccer',
  own_goal_against: 'sports_soccer',
};

export const EVENT_TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'shot', label: 'Shots' },
  { value: 'pass', label: 'Passes' },
  { value: 'carry', label: 'Carries' },
  { value: 'pressure', label: 'Pressures' },
  { value: 'duel', label: 'Duels' },
  { value: 'interception', label: 'Interceptions' },
  { value: 'foul_committed', label: 'Fouls' },
  { value: 'substitution', label: 'Substitutions' },
];

export type Importance = 'goal' | 'card' | 'red' | 'sub' | 'shift' | 'period' | 'shot' | 'normal' | 'minor';

export function cardOf(e: MatchEvent): string | null {
  const c = (e.detail?.card as string | null | undefined) ?? null;
  return c && c !== 'none' ? c : null;
}

export function importance(e: MatchEvent): Importance {
  if ((e.type === 'shot' && e.outcome === 'goal') || e.type === 'own_goal_against') return 'goal';
  const card = cardOf(e);
  if (card) return /red/.test(card) ? 'red' : 'card';
  if (e.type === 'substitution') return 'sub';
  if (e.type === 'tactical_shift') return 'shift';
  if (e.type === 'half_start' || e.type === 'half_end') return 'period';
  if (e.type === 'shot') return 'shot';
  if (e.type === 'pass' || e.type === 'ball_receipt' || e.type === 'carry' || e.type === 'pressure') return 'minor';
  return 'normal';
}

/** Lookup of short names from lineups (events carry full names). */
export function nameIndex(lineups: Lineup[] | undefined) {
  const m = new Map<string, string>();
  lineups?.forEach((l) => [...l.starters, ...l.substitutes].forEach((p) => m.set(p.playerId, p.knownName ?? p.playerName)));
  return m;
}

const human = (s: string) => s.replace(/_/g, ' ');

/** "Messi — shot, goal, xG 0.78" */
export function describe(e: MatchEvent, names: Map<string, string>): string {
  const who = (e.playerId && names.get(e.playerId)) || e.playerName || '';
  const card = cardOf(e);
  switch (e.type) {
    case 'shot': {
      const xg = typeof e.detail.xg === 'number' ? `, xG ${fmtNum(e.detail.xg, 2)}` : '';
      const kind = e.detail.shotType === 'penalty' ? (e.period === 5 ? 'shoot-out penalty' : 'penalty') : 'shot';
      return `${who} — ${kind}, ${e.outcome ? human(e.outcome) : 'unknown'}${xg}`;
    }
    case 'substitution': {
      const on = e.detail.replacementPlayerId ? names.get(e.detail.replacementPlayerId as string) : null;
      return `${on ?? 'Substitute'} on for ${who}`;
    }
    case 'tactical_shift':
      return `Tactical change${e.detail.formation ? ` to ${e.detail.formation}` : ''}`;
    case 'half_start':
      return 'Period starts';
    case 'half_end':
      return 'Period ends';
    case 'starting_xi':
      return `Starting XI${e.detail.formation ? ` · ${e.detail.formation}` : ''}`;
    case 'foul_committed':
      return `${who} — foul${card ? `, ${human(card)}` : ''}${e.detail.penalty ? ', penalty conceded' : ''}`;
    case 'bad_behaviour':
      return `${who} — ${card ? human(card) : 'booked'}`;
    case 'pass':
      return `${who} — pass${e.outcome ? `, ${human(e.outcome)}` : ''}`;
    default:
      return `${who}${who ? ' — ' : ''}${human(e.type)}${e.outcome ? `, ${human(e.outcome)}` : ''}`;
  }
}
