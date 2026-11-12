import { get, request, type Meta } from './client';
import type {
  AdSlot,
  AdsConfig,
  BillingProducts,
  Collection,
  CollectionItemType,
  CollectionLite,
  Comparison,
  Competition,
  Concept,
  ConceptLite,
  Depth,
  EndType,
  Entitlements,
  Feed,
  FollowKind,
  Following,
  Insight,
  Interest,
  Job,
  Learning,
  LearningStatus,
  Lineup,
  MatchDetail,
  MatchEvent,
  MatchSummary,
  MetricDefinition,
  MetricScope,
  MetricsResponse,
  Note,
  NoteSubject,
  Page,
  Plan,
  Player,
  PlayerInMatch,
  Possession,
  Pressing,
  Purchase,
  SavedInsight,
  SavedMatch,
  SearchResults,
  Season,
  Session,
  Shape,
  SquadPlayer,
  Story,
  Subscription,
  Team,
  TeamCoverage,
  TeamLite,
  TeamStyle,
  Transitions,
  User,
} from './types';

const enc = encodeURIComponent;

// ── discovery ────────────────────────────────────────────────────────
export const api = {
  competitions: (q?: string) => get<{ competitions: Competition[] }>('/v1/competitions', { q }),
  competition: (id: string) => get<{ competition: Competition }>(`/v1/competitions/${enc(id)}`),
  seasons: (id: string) => get<{ seasons: Season[] }>(`/v1/competitions/${enc(id)}/seasons`),
  teams: (p: { competitionId?: string; seasonId?: string; q?: string; limit?: number; cursor?: string }) =>
    get<{ teams: TeamLite[]; page: Page }>('/v1/teams', p),
  team: (id: string) => get<{ team: Team }>(`/v1/teams/${enc(id)}`),
  teamPlayers: (id: string, seasonId?: string) => get<{ players: SquadPlayer[] }>(`/v1/teams/${enc(id)}/players`, { seasonId }),
  teamCoverage: (id: string) => get<TeamCoverage>(`/v1/teams/${enc(id)}/coverage`),
  teamStyle: (id: string, seasonId?: string) => get<{ style: TeamStyle }>(`/v1/teams/${enc(id)}/style`, { seasonId }),
  player: (id: string) => get<{ player: Player }>(`/v1/players/${enc(id)}`),
  playerMatches: (id: string, cursor?: string) => get<{ matches: MatchSummary[]; page: Page }>(`/v1/players/${enc(id)}/matches`, { cursor, limit: 25 }),
  search: (q: string, types?: string[]) => get<SearchResults>('/v1/search', { q, types, limit: 8 }),

  // ── matches ──
  matches: (p: {
    competitionId?: string;
    seasonId?: string;
    teamId?: string;
    from?: string;
    to?: string;
    status?: 'scheduled' | 'played';
    analysed?: boolean;
    limit?: number;
    cursor?: string;
  }) => get<{ matches: MatchSummary[]; page: Page; adSlots: AdSlot[] }>('/v1/matches', p),
  match: (id: string) => get<{ match: MatchDetail }>(`/v1/matches/${enc(id)}`),
  lineups: (id: string) => get<{ lineups: Lineup[] }>(`/v1/matches/${enc(id)}/lineups`),
  events: (
    id: string,
    p: { limit?: number; cursor?: string; type?: string[]; teamId?: string; playerId?: string; period?: number; possessionId?: number } = {},
  ) => get<{ events: MatchEvent[]; page: Page }>(`/v1/matches/${enc(id)}/events`, p),
  insights: (id: string, depth: Depth) => get<{ insights: Insight[]; depth: Depth }>(`/v1/matches/${enc(id)}/insights`, { depth }),
  story: (id: string, depth: Depth) => get<{ story: Story }>(`/v1/matches/${enc(id)}/story`, { depth }),

  // ── glossary ──
  concepts: (category?: string) => get<{ concepts: ConceptLite[] }>('/v1/concepts', { category }),
  concept: (key: string) => get<{ concept: Concept }>(`/v1/concepts/${enc(key)}`),
  metricDefinitions: (family?: string) => get<{ metricDefinitions: MetricDefinition[] }>('/v1/metric-definitions', { family }),
  metricDefinition: (key: string) => get<{ metricDefinition: MetricDefinition }>(`/v1/metric-definitions/${enc(key)}`),

  // ── analysis (signed in, metered) ── return meta for x-entitlement-remaining
  metrics: (id: string, p: { scope?: MetricScope; teamId?: string; playerId?: string; keys?: string[]; include?: 'definitions' } = {}) =>
    request<MetricsResponse>(`/v1/matches/${enc(id)}/metrics`, { query: p, auth: 'required' }),
  shape: (id: string, scope: 'full' | '1H' | '2H' = 'full') =>
    request<{ shape: Shape }>(`/v1/matches/${enc(id)}/tactical-shape`, { query: { scope }, auth: 'required' }),
  pressing: (id: string) => request<{ pressing: Pressing }>(`/v1/matches/${enc(id)}/pressing`, { auth: 'required' }),
  transitions: (id: string) => request<{ transitions: Transitions }>(`/v1/matches/${enc(id)}/transitions`, { auth: 'required' }),
  possessions: (id: string, p: { limit?: number; cursor?: string; teamId?: string; endType?: EndType } = {}) =>
    request<{ possessions: Possession[]; page: Page }>(`/v1/matches/${enc(id)}/possessions`, { query: p, auth: 'required' }),
  playerInMatch: (id: string, playerId: string) =>
    request<{ player: PlayerInMatch['player'] } & Partial<PlayerInMatch>>(`/v1/matches/${enc(id)}/players/${enc(playerId)}`, { auth: 'required' }),
  compare: (a: string, b: string, teamId?: string) =>
    request<{ comparison: Comparison }>('/v1/matches/compare', { query: { a, b, teamId }, auth: 'required' }),
  requestAnalysis: (id: string) => request<{ job: Job }>(`/v1/matches/${enc(id)}/analysis-jobs`, { method: 'POST', auth: 'required' }),
  job: (jobId: string) => get<{ job: Job }>(`/v1/jobs/${enc(jobId)}`),

  // ── me ──
  me: () => get<{ user: User }>('/v1/me', undefined, 'required'),
  updateMe: (body: { displayName?: string; locale?: string; depthPreference?: Depth; interests?: Interest[] }) =>
    request<{ user: User }>('/v1/me', { method: 'PATCH', body, auth: 'required' }).then((r) => r.data),
  deleteMe: () => request<{ deleted: boolean }>('/v1/me', { method: 'DELETE', auth: 'required' }).then((r) => r.data),
  sessions: () => get<{ sessions: Session[] }>('/v1/me/sessions', undefined, 'required'),
  revokeSession: (sid: string) => request<{ revoked: boolean }>(`/v1/me/sessions/${enc(sid)}`, { method: 'DELETE', auth: 'required' }).then((r) => r.data),
  feed: () => get<{ feed: Feed; adSlots: AdSlot[] }>('/v1/me/feed', undefined, 'required'),
  following: () => get<{ following: Following }>('/v1/me/following', undefined, 'required'),
  follow: (kind: FollowKind, id: string, on: boolean) =>
    request<Record<string, unknown>>(`/v1/me/following/${kind}/${enc(id)}`, { method: on ? 'PUT' : 'DELETE', auth: 'required' }).then((r) => r.data),
  savedMatches: (cursor?: string) => get<{ savedMatches: SavedMatch[]; page: Page }>('/v1/me/saved-matches', { cursor, limit: 25 }, 'required'),
  saveMatch: (id: string, on: boolean) =>
    request<{ matchId: string; saved: boolean }>(`/v1/me/saved-matches/${enc(id)}`, { method: on ? 'PUT' : 'DELETE', auth: 'required' }).then((r) => r.data),
  savedInsights: (cursor?: string) => get<{ savedInsights: SavedInsight[]; page: Page }>('/v1/me/saved-insights', { cursor, limit: 25 }, 'required'),
  saveInsight: (id: string, on: boolean) =>
    request<{ insightId: string; saved: boolean }>(`/v1/me/saved-insights/${enc(id)}`, { method: on ? 'PUT' : 'DELETE', auth: 'required' }).then((r) => r.data),
  notes: (p: { subjectType?: NoteSubject; subjectId?: string; cursor?: string } = {}) =>
    get<{ notes: Note[]; page: Page }>('/v1/me/notes', { ...p, limit: 50 }, 'required'),
  note: (id: string) => get<{ note: Note }>(`/v1/me/notes/${enc(id)}`, undefined, 'required'),
  createNote: (body: { subjectType: NoteSubject; subjectId: string; body: string }) =>
    request<{ note: Note }>('/v1/me/notes', { method: 'POST', body, auth: 'required' }).then((r) => r.data),
  updateNote: (id: string, body: string) => request<{ note: Note }>(`/v1/me/notes/${enc(id)}`, { method: 'PATCH', body: { body }, auth: 'required' }).then((r) => r.data),
  deleteNote: (id: string) => request<{ id: string; deleted: boolean }>(`/v1/me/notes/${enc(id)}`, { method: 'DELETE', auth: 'required' }).then((r) => r.data),
  collections: () => get<{ collections: CollectionLite[] }>('/v1/me/collections', undefined, 'required'),
  collection: (id: string) => get<{ collection: Collection }>(`/v1/me/collections/${enc(id)}`, undefined, 'required'),
  createCollection: (body: { name: string; description?: string }) =>
    request<{ collection: Collection }>('/v1/me/collections', { method: 'POST', body, auth: 'required' }).then((r) => r.data),
  updateCollection: (id: string, body: { name?: string; description?: string | null }) =>
    request<{ collection: Collection }>(`/v1/me/collections/${enc(id)}`, { method: 'PATCH', body, auth: 'required' }).then((r) => r.data),
  deleteCollection: (id: string) => request<{ id: string; deleted: boolean }>(`/v1/me/collections/${enc(id)}`, { method: 'DELETE', auth: 'required' }).then((r) => r.data),
  addToCollection: (id: string, item: { itemType: CollectionItemType; itemId: string; position?: number }) =>
    request<{ collection: Collection }>(`/v1/me/collections/${enc(id)}/items`, { method: 'PUT', body: item, auth: 'required' }).then((r) => r.data),
  removeFromCollection: (id: string, itemType: CollectionItemType, itemId: string) =>
    request<{ collection: Collection }>(`/v1/me/collections/${enc(id)}/items/${itemType}/${enc(itemId)}`, { method: 'DELETE', auth: 'required' }).then((r) => r.data),
  learning: () => get<{ learning: Learning[] }>('/v1/me/learning', undefined, 'required'),
  setLearning: (key: string, status: LearningStatus) =>
    request<{ conceptKey: string; status: LearningStatus }>(`/v1/me/learning/${enc(key)}`, { method: 'PUT', body: { status }, auth: 'required' }).then((r) => r.data),

  // ── plan, billing, ads ──
  entitlements: () => get<Entitlements>('/v1/entitlements', undefined, 'required'),
  billingProducts: () => get<BillingProducts>('/v1/billing/products'),
  subscription: () => get<{ subscription: Subscription }>('/v1/billing/subscription', undefined, 'required'),
  verifyPurchase: (productId: string, purchaseToken: string) =>
    request<{ purchase: Purchase; plan: Plan }>('/v1/billing/google-play/verify', { method: 'POST', body: { productId, purchaseToken }, auth: 'required', timeoutMs: 30_000 }).then(
      (r) => r.data,
    ),
  restore: () => request<{ purchases: Purchase[]; plan: Plan }>('/v1/billing/restore', { method: 'POST', auth: 'required', timeoutMs: 30_000 }).then((r) => r.data),
  adsConfig: () => get<{ ads: AdsConfig }>('/v1/ads/config'),
};

export type WithMeta<T> = { data: T; meta: Meta };
