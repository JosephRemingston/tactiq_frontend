/** Machine codes from the API envelope (`data.code`), plus client-side codes. */
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'ENTITLEMENT_REQUIRED'
  | 'ENTITLEMENT_EXCEEDED'
  | 'PURCHASE_ACCOUNT_MISMATCH'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL'
  | 'BILLING_NOT_CONFIGURED'
  | 'PROVIDER_UNAVAILABLE'
  // client side
  | 'NETWORK'
  | 'TIMEOUT'
  | 'BAD_RESPONSE';

export type PaywallDetails = {
  featureKey: string;
  paywall: true;
  unlockedBy?: string[];
  sourcePlan?: string;
  limit?: number;
  used?: number;
  periodKey?: string;
  resetsAt?: string;
  seasonsNewer?: number;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: unknown;
  readonly requestId: string | null;
  readonly retryAfter: number | null;

  constructor(opts: { status: number; code: ApiErrorCode; message: string; details?: unknown; requestId?: string | null; retryAfter?: number | null }) {
    super(opts.message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details ?? null;
    this.requestId = opts.requestId ?? null;
    this.retryAfter = opts.retryAfter ?? null;
  }

  get paywall(): PaywallDetails | null {
    const d = this.details as Partial<PaywallDetails> | null;
    if (d && typeof d === 'object' && !Array.isArray(d) && d.paywall === true && typeof d.featureKey === 'string') return d as PaywallDetails;
    return null;
  }

  get isOffline() {
    return this.code === 'NETWORK' || this.code === 'TIMEOUT';
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** The last error with a request id, for Help → Report a problem. */
export const lastError: { current: { requestId: string; message: string; at: string } | null } = { current: null };
