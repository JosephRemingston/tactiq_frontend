import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/services/auth';
import { api } from './endpoints';
import type { CollectionItemType, Depth, EndType, Entitlement, FollowKind, MatchEvent, MetricScope, NoteSubject } from './types';

const DAY = 24 * 60 * 60_000;

/** Every key is scoped to the signed-in user so one account's data never shows for another. */
export function useUserScope() {
  return useAuth((s) => (s.status === 'signedIn' ? (s.userKey ?? 'anon') : 'anon'));
}
export function useSignedInScope() {
  const scope = useUserScope();
  return { scope, signedIn: scope !== 'anon' };
}
const k = (scope: string, ...parts: unknown[]): QueryKey => ['u', scope, ...parts];

// ── discovery ────────────────────────────────────────────────────────

export function useCompetitions() {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'competitions'), queryFn: () => api.competitions(), staleTime: DAY });
}
export function useCompetition(id: string) {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'competition', id), queryFn: () => api.competition(id), enabled: !!id });
}
export function useTeams(p: { competitionId?: string; seasonId?: string; q?: string }, enabled = true) {
  const s = useUserScope();
  return useInfiniteQuery({
    queryKey: k(s, 'teams', p),
    queryFn: ({ pageParam }) => api.teams({ ...p, limit: 50, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.page.nextCursor ?? undefined,
    enabled,
  });
}
export function useTeam(id: string) {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'team', id), queryFn: () => api.team(id), enabled: !!id });
}
export function useTeamPlayers(id: string, seasonId?: string) {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'teamPlayers', id, seasonId), queryFn: () => api.teamPlayers(id, seasonId), enabled: !!id });
}
export function useTeamCoverage(id: string) {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'teamCoverage', id), queryFn: () => api.teamCoverage(id), enabled: !!id });
}
export function useTeamStyle(id: string, seasonId?: string) {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'teamStyle', id, seasonId), queryFn: () => api.teamStyle(id, seasonId), enabled: !!id });
}
export function usePlayer(id: string) {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'player', id), queryFn: () => api.player(id), enabled: !!id });
}
export function usePlayerMatches(id: string) {
  const s = useUserScope();
  return useInfiniteQuery({
    queryKey: k(s, 'playerMatches', id),
    queryFn: ({ pageParam }) => api.playerMatches(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.page.nextCursor ?? undefined,
    enabled: !!id,
  });
}
export function useSearch(q: string, types?: string[]) {
  const s = useUserScope();
  const t = q.trim();
  return useQuery({
    queryKey: k(s, 'search', t, types),
    queryFn: () => api.search(t, types),
    enabled: t.length >= 2 && t.length <= 80,
    placeholderData: (prev) => prev,
  });
}

// ── matches ──────────────────────────────────────────────────────────

export type MatchFilters = {
  competitionId?: string;
  seasonId?: string;
  teamId?: string;
  from?: string;
  to?: string;
  status?: 'scheduled' | 'played';
  analysed?: boolean;
};
export function useMatches(f: MatchFilters, enabled = true) {
  const s = useUserScope();
  return useInfiniteQuery({
    queryKey: k(s, 'matches', f),
    queryFn: ({ pageParam }) => api.matches({ ...f, limit: 25, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.page.nextCursor ?? undefined,
    enabled,
  });
}
export function useMatch(id: string) {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'match', id), queryFn: () => api.match(id), enabled: !!id });
}
export function useLineups(id: string, enabled = true) {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'lineups', id), queryFn: () => api.lineups(id), enabled: !!id && enabled, staleTime: DAY });
}

/**
 * The full, unfiltered event feed of a match (free for everyone), loaded once and cached.
 * Shared by the timeline, shot freeze frames and possession replays, which the backend
 * would otherwise only serve through Pro-gated filters.
 */
export function useAllEvents(matchId: string, enabled = true) {
  return useQuery({
    queryKey: ['events-all', matchId],
    queryFn: async ({ signal }) => {
      const out: MatchEvent[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 40; i++) {
        if (signal.aborted) break;
        const r = await api.events(matchId, { limit: 500, cursor });
        out.push(...r.events);
        if (!r.page.nextCursor) break;
        cursor = r.page.nextCursor;
      }
      return out;
    },
    enabled: !!matchId && enabled,
    staleTime: DAY,
    gcTime: DAY,
  });
}

/** Pro-only filtered timeline. Free users get 403 ENTITLEMENT_REQUIRED from the server. */
export function useFilteredEvents(matchId: string, f: { type?: string[]; teamId?: string; playerId?: string; period?: number }, enabled: boolean) {
  const s = useUserScope();
  return useInfiniteQuery({
    queryKey: k(s, 'events', matchId, f),
    queryFn: ({ pageParam }) => api.events(matchId, { ...f, limit: 200, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.page.nextCursor ?? undefined,
    enabled,
  });
}

export function useInsights(id: string, depth: Depth, enabled = true) {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'insights', id, depth), queryFn: () => api.insights(id, depth), enabled: !!id && enabled, placeholderData: (p) => p });
}
export function useStory(id: string, depth: Depth) {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'story', id, depth), queryFn: () => api.story(id, depth), enabled: !!id, placeholderData: (p) => p });
}

// ── glossary ─────────────────────────────────────────────────────────

export function useConcepts(category?: string) {
  return useQuery({ queryKey: ['concepts', category ?? 'all'], queryFn: () => api.concepts(category), staleTime: DAY, gcTime: DAY });
}
export function useConcept(key: string) {
  return useQuery({ queryKey: ['concept', key], queryFn: () => api.concept(key), enabled: !!key, staleTime: DAY });
}
export function useMetricDefinitions() {
  const q = useQuery({ queryKey: ['metricDefinitions'], queryFn: () => api.metricDefinitions(), staleTime: DAY, gcTime: DAY });
  const byKey = useMemo(() => new Map((q.data?.metricDefinitions ?? []).map((d) => [d.key, d])), [q.data]);
  return { ...q, byKey };
}
export function useMetricDefinition(key: string) {
  return useQuery({ queryKey: ['metricDefinition', key], queryFn: () => api.metricDefinition(key), enabled: !!key, staleTime: DAY });
}

// ── analysis (metered) ───────────────────────────────────────────────

/** Metered views: enabled only after the user confirmed opening analysis for this match. */
function useMeteredOnSuccess() {
  const qc = useQueryClient();
  const s = useUserScope();
  return (remaining: number | null) => {
    if (remaining === null) return;
    qc.setQueryData(k(s, 'entitlements'), (old: Awaited<ReturnType<typeof api.entitlements>> | undefined) =>
      old
        ? {
            ...old,
            entitlements: old.entitlements.map((e: Entitlement) =>
              e.featureKey === 'analysis.matches_per_month' && e.limitValue !== null ? { ...e, remaining, used: e.limitValue - remaining } : e,
            ),
          }
        : old,
    );
  };
}

export function useMetrics(matchId: string, p: { scope?: MetricScope; teamId?: string; playerId?: string; keys?: string[] }, enabled: boolean) {
  const s = useUserScope();
  const onMeter = useMeteredOnSuccess();
  return useQuery({
    queryKey: k(s, 'metrics', matchId, p),
    queryFn: async () => {
      const r = await api.metrics(matchId, { ...p, include: 'definitions' });
      onMeter(r.meta.entitlementRemaining);
      return r.data;
    },
    enabled: !!matchId && enabled,
    staleTime: DAY,
  });
}
export function useShape(matchId: string, scope: 'full' | '1H' | '2H', enabled: boolean) {
  const s = useUserScope();
  const onMeter = useMeteredOnSuccess();
  return useQuery({
    queryKey: k(s, 'shape', matchId, scope),
    queryFn: async () => {
      const r = await api.shape(matchId, scope);
      onMeter(r.meta.entitlementRemaining);
      return r.data.shape;
    },
    enabled: !!matchId && enabled,
    staleTime: DAY,
  });
}
export function usePressing(matchId: string, enabled: boolean) {
  const s = useUserScope();
  const onMeter = useMeteredOnSuccess();
  return useQuery({
    queryKey: k(s, 'pressing', matchId),
    queryFn: async () => {
      const r = await api.pressing(matchId);
      onMeter(r.meta.entitlementRemaining);
      return r.data.pressing;
    },
    enabled: !!matchId && enabled,
    staleTime: DAY,
  });
}
export function useTransitions(matchId: string, enabled: boolean) {
  const s = useUserScope();
  const onMeter = useMeteredOnSuccess();
  return useQuery({
    queryKey: k(s, 'transitions', matchId),
    queryFn: async () => {
      const r = await api.transitions(matchId);
      onMeter(r.meta.entitlementRemaining);
      return r.data.transitions;
    },
    enabled: !!matchId && enabled,
    staleTime: DAY,
  });
}
export function usePossessions(matchId: string, f: { teamId?: string; endType?: EndType }, enabled: boolean) {
  const s = useUserScope();
  const onMeter = useMeteredOnSuccess();
  return useInfiniteQuery({
    queryKey: k(s, 'possessions', matchId, f),
    queryFn: async ({ pageParam }) => {
      const r = await api.possessions(matchId, { ...f, limit: 50, cursor: pageParam });
      onMeter(r.meta.entitlementRemaining);
      return r.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.page.nextCursor ?? undefined,
    enabled: !!matchId && enabled,
    staleTime: DAY,
  });
}
export function usePlayerInMatch(matchId: string, playerId: string, enabled: boolean) {
  const s = useUserScope();
  const onMeter = useMeteredOnSuccess();
  return useQuery({
    queryKey: k(s, 'playerInMatch', matchId, playerId),
    queryFn: async () => {
      const r = await api.playerInMatch(matchId, playerId);
      onMeter(r.meta.entitlementRemaining);
      return r.data.player;
    },
    enabled: !!matchId && !!playerId && enabled,
    staleTime: DAY,
  });
}
export function useCompare(a: string, b: string, teamId: string | undefined, enabled: boolean) {
  const s = useUserScope();
  const qc = useQueryClient();
  return useQuery({
    queryKey: k(s, 'compare', a, b, teamId),
    queryFn: async () => {
      const r = await api.compare(a, b, teamId);
      qc.invalidateQueries({ queryKey: k(s, 'entitlements') });
      return r.data.comparison;
    },
    enabled: !!a && !!b && enabled,
    staleTime: DAY,
  });
}

// ── me ───────────────────────────────────────────────────────────────

export function useMe() {
  const { scope, signedIn } = useSignedInScope();
  return useQuery({ queryKey: k(scope, 'me'), queryFn: () => api.me(), enabled: signedIn });
}
export function useFeed() {
  const { scope, signedIn } = useSignedInScope();
  return useQuery({ queryKey: k(scope, 'feed'), queryFn: () => api.feed(), enabled: signedIn });
}
export function useFollowing() {
  const { scope, signedIn } = useSignedInScope();
  return useQuery({ queryKey: k(scope, 'following'), queryFn: () => api.following(), enabled: signedIn });
}
export function useIsFollowing(kind: FollowKind, id: string | undefined) {
  const f = useFollowing();
  return !!id && !!f.data?.following[kind].some((x) => x.id === id);
}
export function useEntitlements() {
  const { scope, signedIn } = useSignedInScope();
  return useQuery({ queryKey: k(scope, 'entitlements'), queryFn: () => api.entitlements(), enabled: signedIn, staleTime: 30_000 });
}
export function useEntitlement(featureKey: string) {
  const q = useEntitlements();
  return { ...q, ent: q.data?.entitlements.find((e) => e.featureKey === featureKey) ?? null, plan: q.data?.plan ?? null };
}
export function useIsPro() {
  const q = useEntitlements();
  const key = q.data?.plan.key;
  return { isPro: !!key && key !== 'free', loading: q.isLoading, plan: q.data?.plan ?? null };
}
export function useSubscription() {
  const { scope, signedIn } = useSignedInScope();
  return useQuery({ queryKey: k(scope, 'subscription'), queryFn: () => api.subscription(), enabled: signedIn });
}
export function useBillingProducts() {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'billingProducts'), queryFn: () => api.billingProducts(), staleTime: DAY });
}
export function useAdsConfig() {
  const s = useUserScope();
  return useQuery({ queryKey: k(s, 'adsConfig'), queryFn: () => api.adsConfig(), staleTime: 10 * 60_000 });
}
export function useSessions() {
  const { scope, signedIn } = useSignedInScope();
  return useQuery({ queryKey: k(scope, 'sessions'), queryFn: () => api.sessions(), enabled: signedIn });
}
export function useLearning() {
  const { scope, signedIn } = useSignedInScope();
  return useQuery({ queryKey: k(scope, 'learning'), queryFn: () => api.learning(), enabled: signedIn });
}
export function useSavedMatches() {
  const { scope, signedIn } = useSignedInScope();
  return useInfiniteQuery({
    queryKey: k(scope, 'savedMatches'),
    queryFn: ({ pageParam }) => api.savedMatches(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.page.nextCursor ?? undefined,
    enabled: signedIn,
  });
}
export function useSavedInsights() {
  const { scope, signedIn } = useSignedInScope();
  return useInfiniteQuery({
    queryKey: k(scope, 'savedInsights'),
    queryFn: ({ pageParam }) => api.savedInsights(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.page.nextCursor ?? undefined,
    enabled: signedIn,
  });
}
/** Ids of everything saved, for the bookmark state on cards (all pages; Free caps at 100). */
export function useSavedIds() {
  const { scope, signedIn } = useSignedInScope();
  return useQuery({
    queryKey: k(scope, 'savedIds'),
    queryFn: async () => {
      const matches = new Set<string>();
      const insights = new Set<string>();
      let c: string | undefined;
      for (let i = 0; i < 20; i++) {
        const r = await api.savedMatches(c);
        r.savedMatches.forEach((m) => matches.add(m.match.id));
        if (!r.page.nextCursor) break;
        c = r.page.nextCursor;
      }
      c = undefined;
      for (let i = 0; i < 20; i++) {
        const r = await api.savedInsights(c);
        r.savedInsights.forEach((m) => insights.add(m.insightId));
        if (!r.page.nextCursor) break;
        c = r.page.nextCursor;
      }
      return { matches, insights };
    },
    enabled: signedIn,
  });
}
export function useNotes(p: { subjectType?: NoteSubject; subjectId?: string } = {}) {
  const { scope, signedIn } = useSignedInScope();
  return useQuery({ queryKey: k(scope, 'notes', p), queryFn: () => api.notes(p), enabled: signedIn });
}
export function useNote(id: string | undefined) {
  const { scope, signedIn } = useSignedInScope();
  return useQuery({ queryKey: k(scope, 'note', id), queryFn: () => api.note(id!), enabled: signedIn && !!id && id !== 'new' });
}
export function useCollections() {
  const { scope, signedIn } = useSignedInScope();
  return useQuery({ queryKey: k(scope, 'collections'), queryFn: () => api.collections(), enabled: signedIn });
}
export function useCollection(id: string) {
  const { scope, signedIn } = useSignedInScope();
  return useQuery({ queryKey: k(scope, 'collection', id), queryFn: () => api.collection(id), enabled: signedIn && !!id });
}

// ── mutations ────────────────────────────────────────────────────────

function useInvalidate() {
  const qc = useQueryClient();
  const s = useUserScope();
  return (...names: string[]) => Promise.all(names.map((n) => qc.invalidateQueries({ queryKey: k(s, n) })));
}

export function useFollowMutation() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (v: { kind: FollowKind; id: string; on: boolean }) => api.follow(v.kind, v.id, v.on),
    onSettled: () => inv('following', 'feed', 'me'),
  });
}
export function useSaveMatchMutation() {
  const inv = useInvalidate();
  const qc = useQueryClient();
  const s = useUserScope();
  return useMutation({
    mutationFn: (v: { id: string; on: boolean }) => api.saveMatch(v.id, v.on),
    onMutate: (v) => {
      qc.setQueryData(k(s, 'savedIds'), (old: { matches: Set<string>; insights: Set<string> } | undefined) => {
        if (!old) return old;
        const m = new Set(old.matches);
        if (v.on) m.add(v.id);
        else m.delete(v.id);
        return { ...old, matches: m };
      });
    },
    onSettled: () => inv('savedIds', 'savedMatches', 'entitlements'),
  });
}
export function useSaveInsightMutation() {
  const inv = useInvalidate();
  const qc = useQueryClient();
  const s = useUserScope();
  return useMutation({
    mutationFn: (v: { id: string; on: boolean }) => api.saveInsight(v.id, v.on),
    onMutate: (v) => {
      qc.setQueryData(k(s, 'savedIds'), (old: { matches: Set<string>; insights: Set<string> } | undefined) => {
        if (!old) return old;
        const m = new Set(old.insights);
        if (v.on) m.add(v.id);
        else m.delete(v.id);
        return { ...old, insights: m };
      });
    },
    onSettled: () => inv('savedIds', 'savedInsights', 'entitlements'),
  });
}
export function useNoteMutations() {
  const inv = useInvalidate();
  const after = () => inv('notes', 'note');
  return {
    create: useMutation({ mutationFn: api.createNote, onSettled: after }),
    update: useMutation({ mutationFn: (v: { id: string; body: string }) => api.updateNote(v.id, v.body), onSettled: after }),
    remove: useMutation({ mutationFn: api.deleteNote, onSettled: after }),
  };
}
export function useCollectionMutations() {
  const inv = useInvalidate();
  const after = () => inv('collections', 'collection');
  return {
    create: useMutation({ mutationFn: api.createCollection, onSettled: after }),
    update: useMutation({ mutationFn: (v: { id: string; name?: string; description?: string | null }) => api.updateCollection(v.id, v), onSettled: after }),
    remove: useMutation({ mutationFn: api.deleteCollection, onSettled: after }),
    add: useMutation({
      mutationFn: (v: { id: string; itemType: CollectionItemType; itemId: string; position?: number }) =>
        api.addToCollection(v.id, { itemType: v.itemType, itemId: v.itemId, position: v.position }),
      onSettled: after,
    }),
    removeItem: useMutation({ mutationFn: (v: { id: string; itemType: CollectionItemType; itemId: string }) => api.removeFromCollection(v.id, v.itemType, v.itemId), onSettled: after }),
  };
}
export function useLearningMutation() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (v: { key: string; status: 'viewed' | 'saved' | 'completed' }) => api.setLearning(v.key, v.status), onSettled: () => inv('learning') });
}
export function useUpdateMe() {
  const qc = useQueryClient();
  const s = useUserScope();
  return useMutation({
    mutationFn: api.updateMe,
    onSuccess: (r) => qc.setQueryData(k(s, 'me'), r),
  });
}
export { k as queryKey };
