/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';

import { buildUrl, configureClient, request } from './client.ts';
import { ApiError, lastError } from './errors.ts';

type Call = { url: string; auth: string | null; method: string; body: string | undefined };

function reply(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

let calls: Call[];
let queue: (() => Response | Promise<Response>)[];
let tokens: { force: boolean }[];
let signedOut: number;
let nextToken: string | null;

function setup(opts: { token?: string | null; refreshed?: string | null } = {}) {
  calls = [];
  queue = [];
  tokens = [];
  signedOut = 0;
  nextToken = opts.token === undefined ? 'tok-1' : opts.token;
  const refreshed = opts.refreshed === undefined ? 'tok-2' : opts.refreshed;
  configureClient({
    baseUrl: 'http://api.test',
    isDev: true,
    getToken: async (force) => {
      tokens.push({ force });
      return force ? refreshed : nextToken;
    },
    onUnauthorized: () => {
      signedOut++;
    },
    fetchImpl: (async (url: string, init: RequestInit) => {
      const h = new Headers(init.headers);
      calls.push({ url: String(url), auth: h.get('authorization'), method: init.method ?? 'GET', body: init.body as string | undefined });
      const next = queue.shift();
      if (!next) throw new Error('unexpected request');
      return next();
    }) as unknown as typeof fetch,
  });
}

const ok = (data: unknown, headers?: Record<string, string>) => () => reply(200, { statusCode: 200, message: 'ok', data }, headers);
const fail = (status: number, code: string, extra: Record<string, unknown> = {}, headers?: Record<string, string>) => () =>
  reply(status, { statusCode: status, message: `failed ${code}`, data: { code, requestId: 'req-123', ...extra } }, headers);

describe('buildUrl', () => {
  test('joins path, drops empty params, joins arrays with commas', () => {
    assert.equal(
      buildUrl('http://api.test', '/v1/matches', { a: 1, b: '', c: null, d: undefined, types: ['team', 'player'], analysed: true }),
      'http://api.test/v1/matches?a=1&types=team%2Cplayer&analysed=true',
    );
  });
});

describe('request', () => {
  beforeEach(() => setup());

  test('unwraps the envelope and reads meta headers', async () => {
    queue.push(ok({ matches: [1, 2] }, { 'x-request-id': 'rid', 'x-entitlement-remaining': '17' }));
    const { data, meta } = await request<{ matches: number[] }>('/v1/matches');
    assert.deepEqual(data, { matches: [1, 2] });
    assert.equal(meta.requestId, 'rid');
    assert.equal(meta.entitlementRemaining, 17);
    assert.equal(calls[0].auth, 'Bearer tok-1');
  });

  test('absent x-entitlement-remaining means unlimited (null)', async () => {
    queue.push(ok({}));
    const { meta } = await request('/v1/x');
    assert.equal(meta.entitlementRemaining, null);
  });

  test('sends JSON bodies', async () => {
    queue.push(ok({ note: {} }));
    await request('/v1/me/notes', { method: 'POST', body: { body: 'hi' } });
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].body, '{"body":"hi"}');
  });

  test('auth none never sends a token', async () => {
    queue.push(ok({}));
    await request('/v1/competitions', { auth: 'none' });
    assert.equal(calls[0].auth, null);
    assert.equal(tokens.length, 0);
  });

  test('auth required fails fast when signed out, without a request', async () => {
    setup({ token: null });
    await assert.rejects(request('/v1/me', { auth: 'required' }), (e: unknown) => e instanceof ApiError && e.code === 'UNAUTHENTICATED');
    assert.equal(calls.length, 0);
  });

  for (const [status, code] of [
    [400, 'VALIDATION_FAILED'],
    [403, 'ENTITLEMENT_REQUIRED'],
    [403, 'ENTITLEMENT_EXCEEDED'],
    [403, 'PURCHASE_ACCOUNT_MISMATCH'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [500, 'INTERNAL'],
    [503, 'BILLING_NOT_CONFIGURED'],
    [503, 'PROVIDER_UNAVAILABLE'],
  ] as const) {
    test(`${status} ${code} becomes an ApiError with the code and request id`, async () => {
      queue.push(fail(status, code));
      await assert.rejects(request('/v1/x'), (e: unknown) => e instanceof ApiError && e.status === status && e.code === code && e.requestId === 'req-123');
      assert.equal(lastError.current?.requestId, 'req-123');
    });
  }

  test('paywall details are exposed', async () => {
    queue.push(
      fail(403, 'ENTITLEMENT_EXCEEDED', {
        details: { featureKey: 'analysis.matches_per_month', limit: 20, used: 20, resetsAt: '2026-12-01T00:00:00.000Z', paywall: true },
      }),
    );
    await assert.rejects(request('/v1/x'), (e: unknown) => {
      assert.ok(e instanceof ApiError);
      assert.equal(e.paywall?.featureKey, 'analysis.matches_per_month');
      assert.equal(e.paywall?.resetsAt, '2026-12-01T00:00:00.000Z');
      return true;
    });
  });

  test('non-paywall details give paywall null', async () => {
    queue.push(fail(400, 'VALIDATION_FAILED', { details: [{ path: 'q', message: 'too short' }] }));
    await assert.rejects(request('/v1/x'), (e: unknown) => e instanceof ApiError && e.paywall === null);
  });

  test('429 carries retry-after seconds from the header', async () => {
    queue.push(fail(429, 'RATE_LIMITED', {}, { 'retry-after': '12' }));
    await assert.rejects(request('/v1/x'), (e: unknown) => e instanceof ApiError && e.code === 'RATE_LIMITED' && e.retryAfter === 12);
  });

  test('429 falls back to details.retryAfterSeconds', async () => {
    queue.push(fail(429, 'RATE_LIMITED', { details: { retryAfterSeconds: 7 } }));
    await assert.rejects(request('/v1/x'), (e: unknown) => e instanceof ApiError && e.retryAfter === 7);
  });

  test('401 with a token refreshes once and retries', async () => {
    queue.push(fail(401, 'UNAUTHENTICATED'), ok({ user: { id: 'u' } }));
    const { data } = await request<{ user: { id: string } }>('/v1/me');
    assert.equal(data.user.id, 'u');
    assert.deepEqual(
      calls.map((c) => c.auth),
      ['Bearer tok-1', 'Bearer tok-2'],
    );
    assert.deepEqual(tokens, [{ force: false }, { force: true }]);
    assert.equal(signedOut, 0);
  });

  test('401 again after refresh signs the user out', async () => {
    queue.push(fail(401, 'UNAUTHENTICATED'), fail(401, 'UNAUTHENTICATED'));
    await assert.rejects(request('/v1/me'), (e: unknown) => e instanceof ApiError && e.status === 401);
    assert.equal(calls.length, 2);
    assert.equal(signedOut, 1);
  });

  test('401 when the refresh yields no token signs out without a retry', async () => {
    setup({ refreshed: null });
    queue.push(fail(401, 'UNAUTHENTICATED'));
    await assert.rejects(request('/v1/me'));
    assert.equal(calls.length, 1);
    assert.equal(signedOut, 1);
  });

  test('401 without a token does not retry or sign out', async () => {
    setup({ token: null });
    queue.push(fail(401, 'UNAUTHENTICATED'));
    await assert.rejects(request('/v1/matches/x/metrics'), (e: unknown) => e instanceof ApiError && e.status === 401);
    assert.equal(calls.length, 1);
    assert.equal(signedOut, 0);
  });

  test('network failure becomes NETWORK with status 0', async () => {
    queue.push(() => {
      throw new TypeError('Network request failed');
    });
    await assert.rejects(request('/v1/x'), (e: unknown) => e instanceof ApiError && e.code === 'NETWORK' && e.status === 0 && e.isOffline);
  });

  test('timeout becomes TIMEOUT', async () => {
    configureClient({
      baseUrl: 'http://api.test',
      isDev: true,
      getToken: async () => null,
      onUnauthorized: () => {},
      fetchImpl: ((_u: string, init: RequestInit) =>
        new Promise((_r, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted'))))) as unknown as typeof fetch,
    });
    await assert.rejects(request('/v1/x', { timeoutMs: 20 }), (e: unknown) => e instanceof ApiError && e.code === 'TIMEOUT');
  });

  test('a non-JSON 502 becomes INTERNAL', async () => {
    queue.push(() => reply(502, '<html>bad gateway</html>'));
    await assert.rejects(request('/v1/x'), (e: unknown) => e instanceof ApiError && e.code === 'INTERNAL' && e.status === 502);
  });

  test('a release build never sends a request over plain HTTP', async () => {
    let sent = 0;
    const cfg = (baseUrl: string, isDev?: boolean) =>
      configureClient({
        baseUrl,
        isDev,
        getToken: async () => 'tok',
        onUnauthorized: () => {},
        fetchImpl: (async () => {
          sent++;
          return reply(200, { statusCode: 200, message: 'ok', data: {} });
        }) as unknown as typeof fetch,
      });
    cfg('http://api.test'); // isDev omitted: treated as release
    await assert.rejects(request('/v1/me'), (e: unknown) => e instanceof ApiError && e.code === 'NETWORK');
    assert.equal(sent, 0);
    cfg('https://api.test', false);
    await request('/v1/me');
    assert.equal(sent, 1);
  });

  test('a 200 without data is BAD_RESPONSE', async () => {
    queue.push(() => reply(200, { statusCode: 200, message: 'ok' }));
    await assert.rejects(request('/v1/x'), (e: unknown) => e instanceof ApiError && e.code === 'BAD_RESPONSE');
  });
});
