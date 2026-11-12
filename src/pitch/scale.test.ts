/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { makeScale, nodeRadius, pitchSize, xgRadius } from './scale.ts';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≈ ${b}`);

describe('pitchSize', () => {
  test('landscape keeps 105:68', () => {
    const s = pitchSize(436, 'landscape', 8);
    near((s.height - 16) / (436 - 16), 68 / 105);
  });
  test('portrait keeps 68:105', () => {
    const s = pitchSize(356, 'portrait', 8);
    near((s.height - 16) / (356 - 16), 105 / 68);
  });
});

describe('makeScale landscape (attacking left → right)', () => {
  const s = makeScale(1066, 696, 'landscape', 8); // inner 1050 × 680 → 10 px per metre
  test('own goal line centre is on the left', () => {
    const p = s.pt(0, 34);
    near(p.x, 8);
    near(p.y, 8 + 340);
  });
  test("opponent's goal line is on the right", () => near(s.pt(105, 34).x, 8 + 1050));
  test('the left touchline (y = 0) is at the top', () => near(s.pt(50, 0).y, 8));
  test('metres scale uniformly', () => near(s.m(10), 100));
});

describe('makeScale portrait (attacking upwards)', () => {
  const s = makeScale(696, 1066, 'portrait', 8);
  test('own goal line is at the bottom', () => near(s.pt(0, 34).y, 8 + 1050));
  test("opponent's goal is at the top", () => near(s.pt(105, 34).y, 8));
  test('the left touchline (y = 0) is on the left', () => near(s.pt(50, 0).x, 8));
  test('the right touchline (y = 68) is on the right', () => near(s.pt(50, 68).x, 8 + 680));
});

describe('half pitch (shot map)', () => {
  const s = makeScale(533, 696, 'landscape', 8, true); // 52.5 m × 68 m at ~7.6 px/m
  test('halfway line is at the left edge', () => near(s.pt(52.5, 0).x, 8));
  test('goal line is inside the canvas', () => assert.ok(s.pt(105, 34).x <= 533 - 8 + 1e-6));
});

describe('marker sizes', () => {
  test('node radius is area-proportional and bounded', () => {
    near(nodeRadius(0, 68), 7);
    near(nodeRadius(68, 68), 17);
    assert.ok(nodeRadius(17, 68) < 12.5);
    near(nodeRadius(5, 0), 7);
  });
  test('xG radius clamps 0–1', () => {
    near(xgRadius(null), 4);
    near(xgRadius(1), 16);
    near(xgRadius(4), 16);
    near(xgRadius(0.25), 10);
  });
});
