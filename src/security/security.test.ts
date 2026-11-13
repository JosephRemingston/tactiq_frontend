/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { redact, redactText } from './redact.ts';
import { mayCall, releaseProblems } from './release.ts';
import { isAllowedUrl, isoDate, isSlugKey, isUuid, oneOf, smallInt } from './validate.ts';

describe('route parameter validation', () => {
  test('uuid', () => {
    assert.ok(isUuid('01a1cfa6-ef4d-7d12-8434-e22995021412'));
    for (const bad of ['', 'new', '../etc', '01a1cfa6-ef4d-7d12-8434-e2299502141', "01a1cfa6-ef4d-7d12-8434-e22995021412'--", '01a1cfa6-ef4d-7d12-8434-e22995021412/x', undefined, 5, ['a']])
      assert.equal(isUuid(bad), false, String(bad));
  });
  test('concept and metric keys', () => {
    for (const ok of ['ppda', 'zone-14', 'pressing.ppda', 'possession.xt_added']) assert.ok(isSlugKey(ok), ok);
    for (const bad of ['', '..', '../x', 'a/b', 'A', 'a b', 'a..b', '.a', 'a.', 'a%2e', 'x'.repeat(81), null]) assert.equal(isSlugKey(bad), false, String(bad));
  });
  test('oneOf falls back for anything unexpected', () => {
    assert.equal(oneOf('story', ['overview', 'story'] as const, 'overview'), 'story');
    assert.equal(oneOf('__proto__', ['overview', 'story'] as const, 'overview'), 'overview');
    assert.equal(oneOf(undefined, ['overview', 'story'] as const, 'overview'), 'overview');
  });
  test('smallInt accepts plain digits only', () => {
    assert.equal(smallInt('20'), 20);
    for (const bad of ['1e3', '0x10', ' 5 ', '-1', '1.5', '9999999', '', undefined]) assert.equal(smallInt(bad), null, String(bad));
  });
  test('isoDate', () => {
    assert.equal(isoDate('2026-12-01T00:00:00.000Z'), '2026-12-01T00:00:00.000Z');
    assert.equal(isoDate('2026-12-01'), '2026-12-01');
    for (const bad of ['tomorrow', '2026-13-45T00:00:00Z', '<script>', '', undefined]) assert.equal(isoDate(bad), null, String(bad));
  });
});

describe('external links', () => {
  const hosts = ['play.google.com', 'tactiq.josephremingston.dev'];
  test('allows https on listed hosts and their subdomains', () => {
    assert.ok(isAllowedUrl('https://play.google.com/store/account/subscriptions?sku=pro_monthly&package=app.tactiq', hosts));
    assert.ok(isAllowedUrl('https://accounts.tactiq.josephremingston.dev/sign-in', hosts));
  });
  test('rejects everything else', () => {
    for (const bad of [
      'http://play.google.com/x',
      'https://play.google.com.evil.example/x',
      'https://evilplay.google.com.example/',
      'https://user:pass@play.google.com/',
      'https://play.google.com:8443/',
      'javascript:alert(1)',
      'intent://play.google.com/#Intent;end',
      'tactiq://dev',
      'file:///etc/passwd',
      '//play.google.com/x',
      '',
      null,
    ])
      assert.equal(isAllowedUrl(bad, hosts), false, String(bad));
  });
});

describe('release guard', () => {
  const good = { isDev: false, apiUrl: 'https://tactiq.josephremingston.dev', clerkPublishableKey: 'pk_live_abc123', authProvider: 'clerk' as const };
  test('a correct release build has no problems', () => assert.deepEqual(releaseProblems(good), []));
  test('development is never blocked', () =>
    assert.deepEqual(releaseProblems({ isDev: true, apiUrl: 'http://localhost:3000', clerkPublishableKey: '', authProvider: 'simulated' }), []));
  test('plain http, local addresses and credentials are refused', () => {
    assert.ok(releaseProblems({ ...good, apiUrl: 'http://tactiq.josephremingston.dev' }).length);
    assert.ok(releaseProblems({ ...good, apiUrl: 'https://192.168.1.6:3000' }).length);
    assert.ok(releaseProblems({ ...good, apiUrl: 'https://u:p@tactiq.josephremingston.dev' }).length);
    assert.ok(releaseProblems({ ...good, apiUrl: '' }).length);
  });
  test('a missing or secret-looking key and simulated sign-in are refused', () => {
    assert.ok(releaseProblems({ ...good, clerkPublishableKey: '' }).length);
    assert.ok(releaseProblems({ ...good, clerkPublishableKey: 'sk_live_abc123' }).length);
    assert.ok(releaseProblems({ ...good, authProvider: 'simulated' }).length);
  });
  test('mayCall: https only outside development', () => {
    assert.ok(mayCall('http://localhost:3000', true));
    assert.equal(mayCall('http://tactiq.josephremingston.dev', false), false);
    assert.ok(mayCall('https://tactiq.josephremingston.dev', false));
    assert.equal(mayCall('not a url', false), false);
  });
});

describe('log redaction', () => {
  const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEifQ.c2lnbmF0dXJl';
  test('tokens, secrets, purchase tokens and emails are removed from text', () => {
    const out = redactText(`Authorization: Bearer ${jwt} for ada@example.com with sk_live_abcdefgh1234 and fake:pro_monthly:active:30:abc`);
    for (const leak of [jwt, 'ada@example.com', 'sk_live_abcdefgh1234', 'fake:pro_monthly']) assert.equal(out.includes(leak), false, leak);
  });
  test('sensitive object keys are blanked and errors are flattened', () => {
    const out = redact({ purchaseToken: 'x', nested: { email: 'ada@example.com', note: `t=${jwt}` }, err: new Error(`bad ${jwt}`) }) as Record<string, never>;
    const text = JSON.stringify(out);
    assert.equal(text.includes(jwt), false);
    assert.equal(text.includes('ada@example.com'), false);
    assert.equal((out.err as { name: string }).name, 'Error');
  });
});

describe('no secrets in the app', () => {
  const root = join(import.meta.dirname, '..', '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx|json)$/.test(name) && !name.endsWith('.test.ts')) files.push(p);
    }
  };
  walk(join(root, 'src'));
  files.push(join(root, 'app.json'));
  test('source and app.json contain no secret-shaped strings', () => {
    const secret = /\b(sk_(live|test)_[A-Za-z0-9]{6,}|whsec_[A-Za-z0-9+/=]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
    for (const f of files) assert.equal(secret.test(readFileSync(f, 'utf8')), false, `secret-shaped string in ${f}`);
  });
  test('no EXPO_PUBLIC_ variable is named like a secret (those ship inside the app)', () => {
    const named = /EXPO_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|PASSWORD|JWT_KEY)[A-Z0-9_]*/;
    for (const f of files) assert.equal(named.test(readFileSync(f, 'utf8')), false, `secret-named public variable in ${f}`);
  });
});
