import { router } from 'expo-router';

import type { PaywallDetails } from '@/api/errors';
import { fmtDayMonth } from '@/lib/format';

/** Where the user tried to go; picks the context line on the paywall. */
export type PaywallContext =
  | 'analysis_limit'
  | 'event_filters'
  | 'possession_filters'
  | 'older_season'
  | 'saved_limit'
  | 'compare_limit'
  | 'rerun_limit'
  | 'upgrade';

export function contextForFeature(featureKey: string | undefined, hint?: PaywallContext): PaywallContext {
  switch (featureKey) {
    case 'analysis.matches_per_month':
      return 'analysis_limit';
    case 'analysis.advanced_filters':
      return hint === 'possession_filters' ? 'possession_filters' : 'event_filters';
    case 'history.seasons_back':
      return 'older_season';
    case 'following.max_saved_items':
      return 'saved_limit';
    case 'comparisons.per_month':
      return 'compare_limit';
    case 'analysis.rerun_per_month':
      return 'rerun_limit';
    default:
      return hint ?? 'upgrade';
  }
}

/** The context line at the top of the paywall: names what the user just tried to do. */
export function contextLine(ctx: PaywallContext, p: { limit?: number | null; resetsAt?: string | null }) {
  const resets = p.resetsAt ? ` Resets ${fmtDayMonth(p.resetsAt)}.` : '';
  const n = p.limit ?? undefined;
  switch (ctx) {
    case 'analysis_limit':
      return `You've used all ${n ?? 20} analysed matches this month.${resets}`;
    case 'compare_limit':
      return `You've used all ${n ?? 5} comparisons this month.${resets}`;
    case 'rerun_limit':
      return `You've used all ${n ?? 3} re-analysis requests this month.${resets}`;
    case 'event_filters':
      return 'Event filters are a Pro feature.';
    case 'possession_filters':
      return 'Possession filters are a Pro feature.';
    case 'older_season':
      return 'Older seasons are part of Pro.';
    case 'saved_limit':
      return `You've saved ${n ?? 100} matches and insights, the most Free allows.`;
    default:
      return 'Go as deep as you like on every match.';
  }
}

export function openPaywall(p: { featureKey?: string; context?: PaywallContext; resetsAt?: string | null; limit?: number | null }) {
  const ctx = contextForFeature(p.featureKey, p.context);
  router.push({
    pathname: '/paywall',
    params: { context: ctx, ...(p.resetsAt ? { resetsAt: p.resetsAt } : {}), ...(p.limit != null ? { limit: String(p.limit) } : {}) },
  });
}

export function openPaywallFor(details: PaywallDetails, hint?: PaywallContext) {
  openPaywall({ featureKey: details.featureKey, context: hint, resetsAt: details.resetsAt, limit: details.limit });
}
