import { router } from 'expo-router';

import type { ExploreLink } from '@/api/types';

/** Opens the analysis view an insight's `exploreLink` points at (all metered). */
export function openExplore(link: ExploreLink) {
  const base = { matchId: link.matchId, ...(link.teamId ? { teamId: link.teamId } : {}), ...(link.scope ? { scope: link.scope } : {}) };
  const keys = link.metricKeys?.length ? { keys: link.metricKeys.join(',') } : {};
  switch (link.view) {
    case 'pressing':
      return router.push({ pathname: '/match/[matchId]/analysis/pressing', params: base });
    case 'shape':
      return router.push({ pathname: '/match/[matchId]/analysis/shape', params: base });
    case 'shot-map':
      return router.push({ pathname: '/match/[matchId]/analysis/shot-map', params: base });
    case 'player':
      if (link.playerId) return router.push({ pathname: '/match/[matchId]/player/[playerId]', params: { matchId: link.matchId, playerId: link.playerId } });
      return router.push({ pathname: '/match/[matchId]/analysis/metrics', params: { ...base, ...keys } });
    case 'transitions':
      return router.push({ pathname: '/match/[matchId]/analysis/transitions', params: base });
    default:
      return router.push({ pathname: '/match/[matchId]/analysis/metrics', params: { ...base, ...keys, family: link.view } });
  }
}

export const VIEW_LABEL: Record<string, string> = {
  progression: 'progression',
  pressing: 'pressing',
  shape: 'shape and passing',
  'shot-map': 'shot map',
  player: 'player view',
  transitions: 'transitions',
};
