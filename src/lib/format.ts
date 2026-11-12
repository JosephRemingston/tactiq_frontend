import type { MatchSummary } from '@/api/types';

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** "18 Dec 2022" */
export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz });
}
/** "1 December" */
export function fmtDayMonth(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: tz });
}
/** "Sun 18 Dec · 18:00" in the user's time zone. */
export function fmtKickoff(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
  return `${day} · ${time}`;
}
export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
}
export function fmtRelative(iso: string | null | undefined) {
  if (!iso) return '';
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(iso);
}

/** Three-letter team code from a name: "Argentina" → "ARG", "Bayer Leverkusen" → "BLE". */
export function teamCode(name: string) {
  const known: Record<string, string> = {
    Argentina: 'ARG',
    France: 'FRA',
    Croatia: 'CRO',
    Morocco: 'MAR',
    England: 'ENG',
    Germany: 'GER',
    Netherlands: 'NED',
    Portugal: 'POR',
    Spain: 'ESP',
    Brazil: 'BRA',
    Belgium: 'BEL',
    Switzerland: 'SUI',
    Uruguay: 'URU',
    'United States': 'USA',
    Australia: 'AUS',
    Japan: 'JPN',
    'South Korea': 'KOR',
    Poland: 'POL',
    Senegal: 'SEN',
    Denmark: 'DEN',
    Sweden: 'SWE',
    Russia: 'RUS',
    Mexico: 'MEX',
  };
  if (known[name]) return known[name];
  const words = name.replace(/[^A-Za-zÀ-ÿ ]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1].slice(0, 2)).toUpperCase();
  return name.slice(0, 3).toUpperCase();
}

export function scoreLine(m: Pick<MatchSummary, 'home' | 'away'>) {
  if (m.home.score === null || m.away.score === null) return null;
  return `${m.home.score}–${m.away.score}`;
}

export function fmtNum(v: number | null | undefined, digits?: number) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const d = digits ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : Math.abs(v) >= 1 ? 2 : 3);
  return Number(v.toFixed(d)).toLocaleString('en-GB', { maximumFractionDigits: d });
}

export function minuteLabel(minute: number, period?: number) {
  if (period === 5) return 'Pens';
  return `${minute}′`;
}

export function plural(n: number, one: string, many?: string) {
  return `${n.toLocaleString('en-GB')} ${n === 1 ? one : (many ?? `${one}s`)}`;
}

export function displayName(p: { knownName?: string | null; name?: string | null; playerName?: string | null }) {
  return p.knownName ?? p.name ?? p.playerName ?? 'Unknown player';
}

export function initials(name: string | null | undefined) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase() || '?';
}

export const PERIOD_LABEL: Record<number, string> = { 1: '1st half', 2: '2nd half', 3: 'Extra time, 1st half', 4: 'Extra time, 2nd half', 5: 'Penalties' };

export function humanize(s: string) {
  return s.replace(/[_.]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase());
}
