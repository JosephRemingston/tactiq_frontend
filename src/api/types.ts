/**
 * Response types for the Tactiq API. Written from real responses captured from the backend
 * (tools/dev-stack/capture.mjs → .dev/samples); where those differ from api_doc.md, the
 * backend wins. Ids are UUID strings unless noted.
 */

export type Depth = 'quick' | 'explore' | 'advanced';
export type CoverageLabel = 'observed' | 'calculated' | 'inferred';
export type Confidence = 'high' | 'medium' | 'low';
export type CoverageLevel = 'fixtures_only' | 'events' | 'events_and_freeze_frames' | 'tracking';
export type AnalysisStatus = 'none' | 'queued' | 'running' | 'complete' | 'failed';
export type MatchStatus = 'scheduled' | 'played' | 'postponed' | 'cancelled';
export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD' | null;
export type MetricScope = 'full' | '1H' | '2H' | 'ET' | 'leading' | 'drawing' | 'trailing';
export type Direction = 'higher_better' | 'lower_better' | 'neutral';
export type Interest = 'match_explanations' | 'tactics' | 'players' | 'learning' | 'detailed_stats';
export type FollowKind = 'teams' | 'competitions' | 'players';
export type NoteSubject = 'match' | 'team' | 'player' | 'insight';
export type CollectionItemType = 'match' | 'insight' | 'player' | 'team' | 'note';
export type LearningStatus = 'viewed' | 'saved' | 'completed';
export type EndType = 'shot' | 'goal' | 'turnover' | 'out' | 'foul' | 'half_end' | 'other';

export type Page = { nextCursor: string | null; limit: number };
export type Ref = { id: string; name: string };

export type AdSlot = { placement: string; after: string; afterIndex: number; adUnitId: string };

// ── discovery ────────────────────────────────────────────────────────

export type SeasonCoverage = { matches: number; withEvents: number; analysed: number };
export type Season = { id: string; name: string; coverage?: SeasonCoverage };
export type Competition = {
  id: string;
  name: string;
  countryName: string | null;
  gender: string | null;
  isInternational: boolean;
  seasons: Season[];
};

export type TeamLite = { id: string; name: string; countryName: string | null; isNationalTeam: boolean };
export type Team = TeamLite & {
  gender: string | null;
  seasons: { seasonId: string; seasonName: string; competitionId: string; competitionName: string; matches: number }[];
  recentMatches: MatchSummary[];
};
export type TeamCoverage = {
  teamId: string;
  seasons: {
    seasonId: string;
    seasonName: string;
    competitionName: string;
    matches: { fixtures: number; events: number; freezeFrames: number; tracking: number; video: number; analysed: number };
    providers: string[];
  }[];
};
export type SquadPlayer = {
  id: string;
  name: string;
  knownName: string | null;
  countryName: string | null;
  jerseyNumber: number | null;
  seasonId: string | null;
  positionGroup: PositionGroup;
  appearances: number;
  starts: number;
};
export type StyleLabel = { label: string; metricKey: string; percentile: number | null; sample: number };
export type StyleMetric = { n: number; p25: number | null; p75: number | null; median: number | null; competitionPercentile: number | null };
export type TeamStyle = {
  teamId: string;
  teamName: string;
  data: {
    seasonId: string;
    competitionId: string;
    matchesAnalysed: number;
    labels: (StyleLabel | string)[];
    metrics: Record<string, StyleMetric>;
    note: string | null;
    computedAt: string;
  }[];
};
export type Player = {
  id: string;
  name: string;
  knownName: string | null;
  countryName: string | null;
  positionGroup: PositionGroup;
  positionName: string | null;
  appearances: number;
  starts: number;
  teams: { teamId: string; teamName: string; seasonId: string; seasonName: string; jerseyNumber: number | null }[];
};
export type PlayerLite = { id: string; name: string; knownName: string | null; countryName: string | null };
export type ConceptLite = { key: string; name: string; simpleText: string; category?: string };

export type SearchResults = {
  competitions: { id: string; name: string; countryName: string | null }[];
  teams: TeamLite[];
  players: PlayerLite[];
  concepts: ConceptLite[];
  adSlots: AdSlot[];
};

// ── matches ──────────────────────────────────────────────────────────

export type MatchSide = { id: string; name: string; score: number | null; formation?: string | null; manager?: string | null };
export type MatchCoverageLite = {
  hasEvents: boolean;
  hasFreezeFrames: boolean;
  hasTracking: boolean;
  hasVideo: boolean;
  level: CoverageLevel;
};
export type MatchSummary = {
  id: string;
  kickoffAt: string;
  status: MatchStatus;
  stage: string | null;
  competition: Ref;
  season: Ref;
  home: MatchSide;
  away: MatchSide;
  analysisStatus: AnalysisStatus;
  coverage: MatchCoverageLite;
};
export type MatchDetail = MatchSummary & {
  coverage: MatchCoverageLite & {
    hasLineups: boolean;
    eventsCount: number;
    eventProvider: string | null;
    dataQuality: {
      partial: boolean;
      hasExtraTime: boolean;
      hasShootout: boolean;
      periodsPresent: number[];
      missingLocationPct: number;
      eventsWithoutPlayer: number;
      xgSource: string | null;
      unknownTypeNames: string[];
      notes: string[];
    } | null;
    retrievedAt: string | null;
    unavailable: string[];
  };
  matchWeek: number | null;
  stadiumName: string | null;
  refereeName: string | null;
  pitch: { lengthM: number; widthM: number };
  analysis: { status: AnalysisStatus; runId: string | null; analysedAt: string | null; analyticsVersion: number | null } | null;
  licence: { id: string; name: string; attribution: string; commercialUseAllowed: boolean } | null;
};

export type Card = { minute: number; type: string; reason?: string | null };
export type LineupPlayer = {
  teamId?: string;
  teamName?: string;
  playerId: string;
  playerName: string;
  knownName: string | null;
  jerseyNumber: number | null;
  positionName: string | null;
  positionGroup: PositionGroup;
  isStarter: boolean;
  minuteOn: number | null;
  minuteOff: number | null;
  cards: Card[];
};
export type Lineup = { teamId: string; teamName: string; starters: LineupPlayer[]; substitutes: LineupPlayer[] };

export type FreezeFramePlayer = { x: number; y: number; playerId: string | null; teammate: boolean; positionName: string | null };
export type MatchEvent = {
  id: string;
  sequenceIndex: number;
  period: number;
  minute: number;
  second: number;
  clockSeconds: number;
  type: string;
  teamId: string | null;
  playerId: string | null;
  playerName: string | null;
  positionName: string | null;
  possessionId: number | null;
  possessionTeamId: string | null;
  playPattern: string | null;
  x: number | null;
  y: number | null;
  endX: number | null;
  endY: number | null;
  outcome: string | null;
  underPressure: boolean;
  counterpress: boolean;
  duration: number | null;
  relatedEventIds: string[];
  detail: Record<string, unknown> & {
    xg?: number;
    bodyPart?: string;
    technique?: string;
    shotType?: string;
    freezeFrame?: FreezeFramePlayer[];
    formation?: string;
    lineup?: { playerId: string; jerseyNumber: number | null; positionName: string | null }[];
    recipientPlayerId?: string | null;
    replacementPlayerId?: string | null;
    card?: string | null;
  };
};

// ── insights & story ─────────────────────────────────────────────────

export type ExploreView = 'progression' | 'pressing' | 'shape' | 'shot-map' | 'player' | string;
export type ExploreLink = { view: ExploreView; matchId: string; teamId?: string; playerId?: string; scope?: MetricScope; metricKeys?: string[] };
export type Evidence = {
  metrics?: { key: string; scope: MetricScope; value: number | null; teamId: string | null; version: number }[];
  zones?: string[];
  periods?: number[];
  eventIds?: string[];
  totalEvents?: number;
  note?: string;
};
export type Insight = {
  id: string;
  kind: string;
  family: string;
  rank: number;
  teamId: string | null;
  teamName: string | null;
  playerId: string | null;
  playerName: string | null;
  headline: string;
  whatHappened: string;
  whyItMatters: string;
  explanation: string;
  depth: Record<Depth, string>;
  evidence: Evidence;
  confidence: Confidence;
  coverageLabel: CoverageLabel;
  completeness: number;
  exploreLink: ExploreLink | null;
};
export type StoryPattern = {
  id: string;
  kind: string;
  teamId: string | null;
  playerId: string | null;
  headline: string;
  explanation: string;
  confidence: Confidence;
  coverageLabel: CoverageLabel;
  evidence?: Evidence;
  exploreLink: ExploreLink | null;
};
export type StoryStatus = 'full' | 'recap' | 'unavailable' | 'pending_analysis';
export type Story = {
  matchId: string;
  status: StoryStatus;
  depth?: Depth;
  shortVersion?: string;
  teamApproaches?: { teamId: string; teamName: string; formation: string | null; summary: string; labels: string[] }[];
  keyPatterns?: StoryPattern[];
  whatChanged?: { kind: string; text: string; minute: number; insightId?: string }[];
  keyPlayers?: { playerId: string; playerName: string; teamId: string; role: string | null; text: string }[];
  evidenceLinks?: string[];
  coverageStatement: string;
  generatorVersion?: number;
  generatedAt?: string;
};

// ── glossary ─────────────────────────────────────────────────────────

export type Concept = {
  key: string;
  name: string;
  category: string;
  simpleText: string;
  exploreText: string | null;
  advancedText: string | null;
  misconceptions: string | null;
  relatedKeys: string[];
  linkedMetricKeys: string[];
  metrics: { key: string; version: number; name: string; descriptionQuick: string; status: string }[];
  related: { key: string; name: string }[];
};
export type MetricDefinition = {
  key: string;
  version: number;
  name: string;
  family: string;
  unit: string | null;
  direction: Direction;
  descriptionQuick: string;
  descriptionExplore: string | null;
  descriptionAdvanced: string | null;
  formula: string | null;
  requires: Record<string, boolean> | null;
  coverageLabel: CoverageLabel;
  providerCaveats: Record<string, string> | null;
  conceptKeys: string[];
  status: 'active' | 'planned' | string;
};
export type MetricDefLite = Pick<MetricDefinition, 'key' | 'version' | 'name' | 'unit' | 'direction' | 'descriptionQuick' | 'coverageLabel'>;

// ── analysis ─────────────────────────────────────────────────────────

export type AnalysisMeta = { matchId: string; analysisRunId: string; analyticsVersion: number; analysedAt: string };
export type MetricValue = {
  value: number | null;
  valueJson?: Record<string, unknown> | null;
  sampleSize: number | null;
  minutes?: number | null;
  coverageLabel: CoverageLabel;
  evidence?: Evidence & { query?: unknown };
};
export type Metric = MetricValue & { key: string; version: number; scope: MetricScope; teamId: string | null; playerId: string | null };
export type MetricsResponse = AnalysisMeta & { metrics: Metric[]; definitions?: MetricDefLite[] };

export type NetworkNode = { playerId: string; name: string; positionName: string | null; x: number; y: number; passes: number; receptions: number };
export type NetworkEdge = { from: string; to: string; count: number };
export type FormationEvent =
  | { kind: 'starting_formation' | 'tactical_shift'; minute: number; period: number; formation: string; eventId: string }
  | {
      kind: 'substitution';
      minute: number;
      period: number;
      reason: string | null;
      playerOn: string;
      playerOff: string;
      playerOnId: string;
      playerOffId: string;
      eventId: string;
    };
export type ShapeTeam = {
  teamId: string;
  startingFormation: string | null;
  formationTimeline: FormationEvent[];
  passingNetwork: { nodes: NetworkNode[]; edges: NetworkEdge[]; untilFirstSub?: { minute: number | null; nodes: NetworkNode[]; edges: NetworkEdge[] } };
  averagePositions: NetworkNode[];
};
export type Shape = AnalysisMeta & { scope: string; teams: ShapeTeam[]; unavailable?: { metrics: string[]; reason: string }[]; note?: string };

export type ScopedMetrics = { teamId: string; scopes: Partial<Record<MetricScope, Record<string, MetricValue | null>>> };
export type Pressing = AnalysisMeta & { teams: ScopedMetrics[]; topPressers?: { teamId: string; players: { playerId: string; pressures: number }[] }[] };
export type Transitions = AnalysisMeta & { teams: ScopedMetrics[] };

export type Possession = {
  matchId?: string;
  possessionId: number;
  teamId: string;
  period: number;
  startEventId: string;
  endEventId: string;
  startClock: number;
  endClock: number;
  startX: number | null;
  startY: number | null;
  endType: EndType;
  nEvents: number;
  nPasses: number;
  reachedFinalThird: boolean;
  reachedBox: boolean;
  xtNet: number | null;
  xgTotal: number | null;
  playPattern: string | null;
};

export type Shot = {
  eventId: string;
  minute: number;
  period: number;
  x: number;
  y: number;
  xg: number | null;
  outcome: string;
  bodyPart: string | null;
  shotType: string | null;
  playerId: string | null;
  playerName: string | null;
  underPressure: boolean;
};

export type Role = {
  role: string;
  roleLabel: string;
  family: string;
  similarity: number;
  secondRole: string | null;
  secondRoleLabel: string | null;
  secondSimilarity: number | null;
  topFeatures: string[];
  features: Record<string, number>;
  z: Record<string, number>;
  positionName?: string | null;
  reference?: { id: string; provisional: boolean };
  coverageLabel: CoverageLabel;
};
export type PlayerInMatch = AnalysisMeta & {
  player: {
    playerId: string;
    name: string;
    teamId: string;
    positionName: string | null;
    positionGroup: PositionGroup;
    isStarter: boolean;
    minutes: number;
    role: Role | null;
    metrics: Metric[];
  };
};

export type Comparison = {
  keys: string[];
  matches: {
    matchId: string;
    kickoffAt: string;
    home: MatchSide;
    away: MatchSide;
    competition: Ref;
    coverage: CoverageLevel;
    teams: { teamId: string; metrics: Record<string, number | null> }[];
  }[];
};

export type JobStatus = 'queued' | 'active' | 'completed' | 'failed' | 'dead' | 'skipped';
export type Job = {
  jobId: string;
  type: string;
  status: JobStatus;
  progress: { pct: number; step: string } | null;
  matchId: string | null;
  attempts: number;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  existing?: boolean;
};

// ── me ───────────────────────────────────────────────────────────────

export type Plan = { key: 'free' | 'pro_monthly' | 'pro_annual' | string; source: string; currentPeriodEnd: string | null };
export type User = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string;
  depthPreference: Depth;
  interests: Interest[];
  plan: Plan;
  followingCounts: { teams: number; competitions: number; players: number };
  createdAt: string;
};
export type Session = { id: string; status: string; lastActiveAt: string | null; expireAt: string | null; clientId: string | null };

export type Feed = {
  empty: boolean;
  nextStep?: string;
  recent: MatchSummary[];
  upcoming: MatchSummary[];
  insights: { id: string; matchId: string; headline: string; kind: string; teamId: string | null; rank: number; exploreLink: ExploreLink | null }[];
  concepts: ConceptLite[];
};

export type Following = {
  teams: { id: string; name: string; countryName: string | null; followedAt: string }[];
  competitions: { id: string; name: string; countryName: string | null; followedAt: string }[];
  players: { id: string; name: string; knownName?: string | null; countryName: string | null; followedAt: string }[];
};
export type SavedMatch = { savedAt: string; match: MatchSummary };
export type SavedInsight = {
  id: string;
  savedAt: string;
  insightId: string;
  matchId: string;
  headline: string;
  whatHappened: string;
  kind: string;
  teamId: string | null;
  exploreLink: ExploreLink | null;
};
export type Note = { id: string; subjectType: NoteSubject; subjectId: string; body: string; createdAt: string; updatedAt: string };
export type CollectionItem = { collectionId: string; itemType: CollectionItemType; itemId: string; position: number; addedAt: string };
export type CollectionLite = { id: string; name: string; description: string | null; createdAt: string; updatedAt: string; items: number };
export type Collection = Omit<CollectionLite, 'items'> & { items: CollectionItem[] };
export type Learning = { conceptKey: string; name: string; status: LearningStatus; updatedAt: string };

// ── plan, billing, ads ───────────────────────────────────────────────

export type Entitlement = {
  featureKey: string;
  limitValue: number | null;
  usagePeriod: 'month' | 'none';
  sourcePlan: string;
  used: number | null;
  remaining: number | null;
  periodKey: string | null;
  resetsAt: string | null;
};
export type Entitlements = { plan: Plan; entitlements: Entitlement[] };

export type PurchaseState = 'pending' | 'active' | 'grace' | 'on_hold' | 'paused' | 'cancelled' | 'expired' | 'revoked';
export type Purchase = {
  productId: string;
  planKey: string;
  state: PurchaseState;
  entitled: boolean;
  autoRenewing: boolean;
  expiresAt: string | null;
  lastVerifiedAt: string | null;
};
export type Subscription = {
  plan: Plan;
  billingAvailable: boolean;
  billingProvider: string | null;
  obfuscatedAccountId: string;
  purchase: Purchase | null;
  manageUrl: string | null;
};
export type BillingProducts = {
  billingAvailable: boolean;
  plans: {
    planKey: string;
    name: string;
    features: Record<string, { limitValue: number | null; usagePeriod: string }>;
    products: { productId: string; store: string; billingPeriod: string }[];
  }[];
  comparison: { group: string; items: { label: string; featureKey: string; free: string; pro: string }[] }[];
};

export type AdPlacement = {
  key: string;
  screen: string;
  format: 'native' | 'banner';
  position: { after?: string; first?: number; every?: number; slot?: string };
  maxPerSession: number;
  adUnitId: string;
};
export type AdsConfig = {
  enabled: boolean;
  reason: 'plan' | 'not_configured' | null;
  network: string;
  version: number;
  testUnits: boolean;
  placements: AdPlacement[];
  adFreeScreens: string[];
  frequency: { minSecondsBetweenAds: number; maxPerSession: number };
  rewardedAds: boolean;
};
