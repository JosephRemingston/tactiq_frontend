// Pitch geometry (pure; tested with node --test).
//
// API frame: metres on a 105 × 68 pitch. x runs from the acting team's own goal line (0) to the
// opponent's (105), so every team attacks towards +x; y runs 0–68 from the attacking team's
// left touchline. Landscape draws the team attacking left → right (their left touchline at the
// top). Portrait draws them attacking upwards (left touchline on the left).

export const PITCH = { length: 105, width: 68 } as const;

export type Orientation = 'landscape' | 'portrait';

export type PitchScale = {
  width: number;
  height: number;
  /** Size of the drawn pitch rectangle (excluding padding). */
  inner: { x: number; y: number; w: number; h: number };
  /** Metres → canvas point. */
  pt: (x: number, y: number) => { x: number; y: number };
  /** Metres (along either axis) → canvas units. */
  m: (metres: number) => number;
  orientation: Orientation;
};

/** Canvas size for a given available width, keeping 105:68 (landscape) or 68:105 (portrait). */
export function pitchSize(availableWidth: number, orientation: Orientation, padding = 8, half = false) {
  const len = half ? PITCH.length / 2 : PITCH.length;
  const ratio = orientation === 'landscape' ? PITCH.width / len : len / PITCH.width;
  const innerW = availableWidth - padding * 2;
  return { width: availableWidth, height: Math.round(innerW * ratio + padding * 2) };
}

/**
 * Builds the mapping. `half` shows only the attacking half (x 52.5–105), used by the shot map.
 */
export function makeScale(width: number, height: number, orientation: Orientation, padding = 8, half = false): PitchScale {
  const inner = { x: padding, y: padding, w: width - padding * 2, h: height - padding * 2 };
  const x0 = half ? PITCH.length / 2 : 0;
  const len = PITCH.length - x0;
  if (orientation === 'landscape') {
    const k = Math.min(inner.w / len, inner.h / PITCH.width);
    return {
      width,
      height,
      inner,
      orientation,
      m: (v) => v * k,
      pt: (x, y) => ({ x: inner.x + (x - x0) * k, y: inner.y + y * k }),
    };
  }
  const k = Math.min(inner.w / PITCH.width, inner.h / len);
  return {
    width,
    height,
    inner,
    orientation,
    m: (v) => v * k,
    pt: (x, y) => ({ x: inner.x + y * k, y: inner.y + (PITCH.length - x) * k }),
  };
}

/** Landmarks in metres (from the backend's utils/pitch.js). */
export const ZONES = {
  thirds: [35, 70],
  box: { x: 88.5, y0: 13.84, y1: 54.16 },
  sixYard: { x: 99.5, y0: 24.84, y1: 43.16 },
  penaltySpot: 94,
  zone14: { x0: 70, x1: 87.5, y0: 22.67, y1: 45.33 },
  /** Five lanes, 13.6 m each; the half-spaces are lanes 2 and 4. */
  lanes: [13.6, 27.2, 40.8, 54.4],
  halfSpaces: [
    { y0: 13.6, y1: 27.2 },
    { y0: 40.8, y1: 54.4 },
  ],
  centreCircle: 9.15,
} as const;

/** Clamp to the pitch (some events sit a little outside the lines). */
export function clampToPitch(x: number, y: number) {
  return { x: Math.max(0, Math.min(PITCH.length, x)), y: Math.max(0, Math.min(PITCH.width, y)) };
}

/** Node radius for a passing-network player sized by passes (area-proportional). */
export function nodeRadius(passes: number, maxPasses: number, min = 7, max = 17) {
  if (maxPasses <= 0) return min;
  return min + (max - min) * Math.sqrt(Math.max(0, passes) / maxPasses);
}

/** Shot marker radius sized by xG (area-proportional), xG 0–1. */
export function xgRadius(xg: number | null, min = 4, max = 16) {
  const v = Math.max(0, Math.min(1, xg ?? 0));
  return min + (max - min) * Math.sqrt(v);
}
