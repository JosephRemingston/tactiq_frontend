import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { MatchDetail } from '@/api/types';
import { teamCode } from '@/lib/format';

export type Side = 'home' | 'away';

type Ctx = {
  match: MatchDetail;
  sideOf: (teamId: string | null | undefined) => Side | null;
  nameOf: (teamId: string | null | undefined) => string;
  codeOf: (teamId: string | null | undefined) => string;
  /** Analysis views need event data and a completed analysis. */
  analysable: boolean;
  hasEvents: boolean;
};

const MatchCtx = createContext<Ctx | null>(null);

export function MatchProvider({ match, children }: { match: MatchDetail; children: ReactNode }) {
  const value = useMemo<Ctx>(() => {
    const sideOf = (id: string | null | undefined): Side | null => (id === match.home.id ? 'home' : id === match.away.id ? 'away' : null);
    const nameOf = (id: string | null | undefined) => (id === match.home.id ? match.home.name : id === match.away.id ? match.away.name : '');
    return {
      match,
      sideOf,
      nameOf,
      codeOf: (id) => teamCode(nameOf(id)),
      hasEvents: match.coverage.hasEvents && match.coverage.level !== 'fixtures_only',
      analysable: match.coverage.hasEvents && match.analysisStatus === 'complete',
    };
  }, [match]);
  return <MatchCtx.Provider value={value}>{children}</MatchCtx.Provider>;
}

export function useMatchCtx() {
  const v = useContext(MatchCtx);
  if (!v) throw new Error('useMatchCtx outside MatchProvider');
  return v;
}

/** "Argentina won 4–2 on penalties" from the story's short version (the API has no shootout score field). */
export function shootoutLine(shortVersion: string | undefined) {
  if (!shortVersion) return null;
  const m = shortVersion.match(/([A-Z][\p{L} .'-]+?) won (\d+)[-–](\d+) on penalties/u);
  return m ? `${m[1]} won ${m[2]}–${m[3]} on penalties` : null;
}
