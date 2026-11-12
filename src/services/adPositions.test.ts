/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { AdPacer, interleaveAds } from './adPositions.ts';

const ads = (rows: ReturnType<typeof interleaveAds<number>>) =>
  rows.map((r) => (r.kind === 'ad' ? 'AD' : String(r.item))).join(' ');

describe('interleaveAds', () => {
  test('home feed: after the 4th item, then every 6th, max 3', () => {
    const items = Array.from({ length: 20 }, (_, i) => i + 1);
    assert.equal(ads(interleaveAds(items, { afterIndex: 3, every: 6, max: 3 })), '1 2 3 4 AD 5 6 7 8 9 10 AD 11 12 13 14 15 16 AD 17 18 19 20');
  });
  test('explore: after the 5th, then every 8th', () => {
    const items = Array.from({ length: 14 }, (_, i) => i + 1);
    assert.equal(ads(interleaveAds(items, { afterIndex: 4, every: 8, max: 3 })), '1 2 3 4 5 AD 6 7 8 9 10 11 12 13 AD 14');
  });
  test('no ad when the list is too short, and never as the last row', () => {
    assert.equal(ads(interleaveAds([1, 2, 3, 4], { afterIndex: 3, every: 6, max: 3 })), '1 2 3 4');
    assert.equal(ads(interleaveAds([1, 2, 3, 4, 5], { afterIndex: 3, every: 6, max: 3 })), '1 2 3 4 AD 5');
  });
  test('null options (Pro, or ads off) leave the list unchanged', () => {
    assert.equal(ads(interleaveAds([1, 2, 3, 4, 5, 6], null)), '1 2 3 4 5 6');
  });
  test('max 0 inserts nothing', () => {
    assert.equal(ads(interleaveAds([1, 2, 3, 4, 5, 6], { afterIndex: 0, every: 1, max: 0 })), '1 2 3 4 5 6');
  });
});

describe('AdPacer', () => {
  test('at most one ad a minute', () => {
    let t = 0;
    const p = new AdPacer({ minSecondsBetweenAds: 60, maxPerSession: 6 }, () => t);
    assert.equal(p.request('a', 'home', 3), true);
    t = 30_000;
    assert.equal(p.request('b', 'home', 3), false);
    t = 61_000;
    assert.equal(p.request('b', 'home', 3), true);
  });
  test('the same ad re-rendering is not a new impression', () => {
    let t = 0;
    const p = new AdPacer({ minSecondsBetweenAds: 60, maxPerSession: 6 }, () => t);
    assert.equal(p.request('a', 'home', 3), true);
    t = 1000;
    assert.equal(p.request('a', 'home', 3), true);
  });
  test('per-placement and per-session caps', () => {
    let t = 0;
    const p = new AdPacer({ minSecondsBetweenAds: 0, maxPerSession: 4 }, () => t++);
    assert.equal(p.request('h1', 'home', 2), true);
    assert.equal(p.request('h2', 'home', 2), true);
    assert.equal(p.request('h3', 'home', 2), false);
    assert.equal(p.request('e1', 'explore', 3), true);
    assert.equal(p.request('e2', 'explore', 3), true);
    assert.equal(p.request('e3', 'explore', 3), false);
  });
});
