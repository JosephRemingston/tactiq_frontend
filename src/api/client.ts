// The Tactiq API client. Dependency-free (no React Native imports) so it runs under `node --test`.
import { ApiError, lastError, type ApiErrorCode } from './errors.ts';

export type Meta = {
  requestId: string | null;
  /** x-entitlement-remaining: units left this period on metered routes; null when unlimited/absent. */
  entitlementRemaining: number | null;
  retryAfter: number | null;
  status: number;
};

export type Query = Record<string, string | number | boolean | null | undefined | string[]>;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Query;
  body?: unknown;
  /** `none`: never send a token. `optional`: send one if signed in. `required`: fail fast when signed out. */
  auth?: 'none' | 'optional' | 'required';
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type ClientConfig = {
  baseUrl: string;
  /** Returns a session token, or null when signed out. `force` asks for a fresh one. */
  getToken: (force: boolean) => Promise<string | null>;
  /** Called when a refreshed token is still rejected: the app signs the user out. */
  onUnauthorized: () => void;
  fetchImpl?: typeof fetch;
};

let config: ClientConfig | null = null;

export function configureClient(c: ClientConfig) {
  config = c;
}

export function buildUrl(base: string, path: string, query?: Query) {
  const url = new URL(path.replace(/^\//, ''), base.endsWith('/') ? base : `${base}/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
  }
  return url.toString();
}

function numHeader(h: Headers, name: string) {
  const v = h.get(name);
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const KNOWN: ApiErrorCode[] = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'ENTITLEMENT_REQUIRED',
  'ENTITLEMENT_EXCEEDED',
  'PURCHASE_ACCOUNT_MISMATCH',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL',
  'BILLING_NOT_CONFIGURED',
  'PROVIDER_UNAVAILABLE',
];

function codeFor(status: number, code: unknown): ApiErrorCode {
  if (typeof code === 'string' && (KNOWN as string[]).includes(code)) return code as ApiErrorCode;
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 400 || status === 413) return 'VALIDATION_FAILED';
  return 'INTERNAL';
}

async function once<T>(path: string, opts: RequestOptions, token: string | null): Promise<{ data: T; meta: Meta }> {
  if (!config) throw new Error('API client not configured');
  const f = config.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);

  let res: Response;
  try {
    res = await f(buildUrl(config.baseUrl, path, opts.query), {
      method: opts.method ?? 'GET',
      headers: {
        accept: 'application/json',
        ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = controller.signal.aborted && !opts.signal?.aborted;
    throw new ApiError({
      status: 0,
      code: aborted ? 'TIMEOUT' : 'NETWORK',
      message: aborted ? 'The request took too long' : 'No connection',
      details: e instanceof Error ? e.message : null,
    });
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener('abort', onAbort);
  }

  const meta: Meta = {
    requestId: res.headers.get('x-request-id'),
    entitlementRemaining: numHeader(res.headers, 'x-entitlement-remaining'),
    retryAfter: numHeader(res.headers, 'retry-after'),
    status: res.status,
  };

  type Envelope = { statusCode?: number; message?: string; data?: unknown };
  let json: Envelope | null;
  try {
    json = (await res.json()) as Envelope | null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const data = (json?.data ?? {}) as { code?: unknown; details?: unknown; requestId?: string };
    const details = data.details as { retryAfterSeconds?: number } | undefined;
    const err = new ApiError({
      status: res.status,
      code: json ? codeFor(res.status, data.code) : res.status >= 500 ? 'INTERNAL' : codeFor(res.status, null),
      message: json?.message ?? `Request failed (${res.status})`,
      details: data.details,
      requestId: data.requestId ?? meta.requestId,
      retryAfter: meta.retryAfter ?? (typeof details?.retryAfterSeconds === 'number' ? details.retryAfterSeconds : null),
    });
    if (err.requestId) lastError.current = { requestId: err.requestId, message: err.message, at: new Date().toISOString() };
    throw err;
  }
  if (!json || typeof json !== 'object' || json.data === undefined || json.data === null || typeof json.data !== 'object') {
    throw new ApiError({ status: res.status, code: 'BAD_RESPONSE', message: 'Unexpected response from the server', requestId: meta.requestId });
  }
  return { data: json.data as T, meta };
}

/**
 * One API call. Unwraps `{ statusCode, message, data }` and returns `data` with header meta.
 * On 401 with a token: fetch a fresh token and retry once; if still 401, sign the user out.
 */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; meta: Meta }> {
  if (!config) throw new Error('API client not configured');
  const mode = opts.auth ?? 'optional';
  let token = mode === 'none' ? null : await config.getToken(false);
  if (mode === 'required' && !token) {
    throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Sign in to see this' });
  }
  try {
    return await once<T>(path, opts, token);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401 || !token) throw e;
    token = await config.getToken(true);
    if (!token) {
      config.onUnauthorized();
      throw e;
    }
    try {
      return await once<T>(path, opts, token);
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 401) config.onUnauthorized();
      throw e2;
    }
  }
}

export async function get<T>(path: string, query?: Query, auth: RequestOptions['auth'] = 'optional') {
  return (await request<T>(path, { query, auth })).data;
}
