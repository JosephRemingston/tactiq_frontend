import { Easing } from 'react-native-reanimated';

/**
 * Motion constants copied from design.md. Every animation in the app uses these.
 *   settle-in   .5s cubic-bezier(.2,.8,.3,1), 12px rise, .08s stagger
 *   knob        .28s cubic-bezier(.4,1.35,.5,1)   (springs past and settles)
 *   swap        .22s fade + 6px rise; content rewritten at max(60, fade*.55) = 154ms
 *   card lift   .35s cubic-bezier(.2,.8,.3,1), 4px
 *   button lift .25s ease, 2px + brightness
 *   label dim   .25s ease to .45
 */
export const curves = {
  settle: Easing.bezier(0.2, 0.8, 0.3, 1),
  knob: Easing.bezier(0.4, 1.35, 0.5, 1),
  ease: Easing.bezier(0.25, 0.1, 0.25, 1),
} as const;

const FADE = 280;

export const motion = {
  rise: { duration: 500, distance: 12, stagger: 80 },
  knob: { duration: 280 },
  swap: { duration: 220, distance: 6, half: Math.max(60, FADE * 0.55) },
  cardLift: { duration: 350, distance: 4 },
  buttonLift: { duration: 250, distance: 2 },
  dim: { duration: 250, opacity: 0.45 },
  sheet: { duration: 350 },
  replayMax: 600,
  swipe: { minDistance: 55, ratio: 1.6 },
} as const;
