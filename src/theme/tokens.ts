/**
 * Colour tokens. The light palette is design.md's verbatim (bg, ink, line, card, pill, list,
 * dark card, lime). Three changes for WCAG AA, which design.md does not meet on white:
 *  - `muted` text is #6a7075 (5.0:1) instead of #8b9096 (3.2:1); #8b9096 survives as `faint`
 *    for decoration and disabled text only.
 *  - lime is never text on a light surface (1.3:1); `accentText` is ink in light, lime in dark.
 *  - team, status and pitch colours are new; they are flat and checked at 3:1 against their surface.
 * The dark theme is design.md's dark card (#0c1112, ink #f2f5f6, list #dfe4e6, period #a9b0b3)
 * promoted to a full theme.
 */
export type ThemeName = 'light' | 'dark';

export type Palette = {
  name: ThemeName;
  bg: string;
  surface: string; // cards
  surfaceLow: string; // surface-container 1: grouped backgrounds, skeletons
  surfaceMid: string; // surface-container 2: pressed rows, inputs
  surfaceHigh: string; // surface-container 3: pills, chips
  ink: string;
  inkSecondary: string; // design.md "list"
  muted: string;
  faint: string;
  line: string;
  cardLine: string;
  pill: string;
  pillInk: string;
  pillLine: string;

  // Hero surface: design.md's dark card, used in both themes (score header, Pro card).
  hero: string;
  heroInk: string;
  heroInkSecondary: string;
  heroMuted: string;
  heroLine: string;

  lime: string;
  limeDeep: string;
  limeSoft: string; // tinted backgrounds
  onLime: string;
  accentText: string; // lime as text where it is readable
  focus: string;

  home: string;
  away: string;
  homeSoft: string;
  awaySoft: string;

  success: string;
  warning: string;
  error: string;
  inferred: string;
  successSoft: string;
  warningSoft: string;
  errorSoft: string;
  inferredSoft: string;

  sponsored: string; // ad card tint, never used for content
  sponsoredLine: string;

  pitchFill: string;
  pitchLine: string;
  pitchZone: string;

  scrim: string;
  shadow: string;
  deco: string;
};

export const light: Palette = {
  name: 'light',
  bg: '#ffffff',
  surface: '#ffffff',
  surfaceLow: '#f6f7f7',
  surfaceMid: '#f0f1f2',
  surfaceHigh: '#e9ebec',
  ink: '#0b0d0e',
  inkSecondary: '#4a5054',
  muted: '#6a7075',
  faint: '#8b9096',
  line: '#ececec',
  cardLine: '#efefef',
  pill: '#e9ebec',
  pillInk: '#141719',
  pillLine: '#ececec',

  hero: '#0c1112',
  heroInk: '#f2f5f6',
  heroInkSecondary: '#dfe4e6',
  heroMuted: '#a9b0b3',
  heroLine: 'rgba(255,255,255,0.14)',

  lime: '#cdf348',
  limeDeep: '#a9dd28',
  limeSoft: '#f3fbd6',
  onLime: '#101a05',
  accentText: '#0b0d0e',
  focus: '#a9dd28',

  home: '#1d5fd1',
  away: '#c2410c',
  homeSoft: '#e7eefb',
  awaySoft: '#fbebe3',

  success: '#1a7f37',
  warning: '#8a5a00',
  error: '#c62828',
  inferred: '#6b5fa8',
  successSoft: '#e6f4ea',
  warningSoft: '#fdf3dc',
  errorSoft: '#fdecec',
  inferredSoft: '#efedf8',

  sponsored: '#f7f5ee',
  sponsoredLine: '#e6e1cf',

  pitchFill: '#f6f7f7',
  pitchLine: 'rgba(11,13,14,0.30)',
  pitchZone: 'rgba(11,13,14,0.06)',

  scrim: 'rgba(11,13,14,0.45)',
  shadow: '#000000',
  deco: '#efefef',
};

export const dark: Palette = {
  name: 'dark',
  bg: '#070a0b',
  surface: '#0c1112',
  surfaceLow: '#0f1516',
  surfaceMid: '#141b1c',
  surfaceHigh: '#1b2324',
  ink: '#f2f5f6',
  inkSecondary: '#dfe4e6',
  muted: '#a9b0b3',
  faint: '#7d8588',
  line: 'rgba(255,255,255,0.08)',
  cardLine: 'rgba(255,255,255,0.09)',
  pill: 'rgba(255,255,255,0.07)',
  pillInk: '#eef3f4',
  pillLine: 'rgba(255,255,255,0.14)',

  hero: '#0c1112',
  heroInk: '#f2f5f6',
  heroInkSecondary: '#dfe4e6',
  heroMuted: '#a9b0b3',
  heroLine: 'rgba(255,255,255,0.14)',

  lime: '#cdf348',
  limeDeep: '#a9dd28',
  limeSoft: 'rgba(205,243,72,0.12)',
  onLime: '#101a05',
  accentText: '#cdf348',
  focus: '#cdf348',

  home: '#6ea8ff',
  away: '#ff9152',
  homeSoft: 'rgba(110,168,255,0.14)',
  awaySoft: 'rgba(255,145,82,0.14)',

  success: '#4cc46b',
  warning: '#e0a93a',
  error: '#ff6b6b',
  inferred: '#b2a6ec',
  successSoft: 'rgba(76,196,107,0.14)',
  warningSoft: 'rgba(224,169,58,0.14)',
  errorSoft: 'rgba(255,107,107,0.14)',
  inferredSoft: 'rgba(178,166,236,0.14)',

  sponsored: '#14130f',
  sponsoredLine: 'rgba(230,225,207,0.16)',

  pitchFill: '#0c1112',
  pitchLine: 'rgba(242,245,246,0.26)',
  pitchZone: 'rgba(242,245,246,0.06)',

  scrim: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
  deco: 'rgba(255,255,255,0.06)',
};

export const palettes = { light, dark };

/** 4 dp grid. */
export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 44 } as const;
export const gutter = 16;

/** design.md phone step: radius 20, pad 24; buttons 12; pills full round. */
export const radius = { card: 20, cardSm: 16, sheet: 24, button: 12, input: 12, tile: 14, pill: 999 } as const;

/** design.md shadows, translated. Flat by default; elevation only for sheets, menus and the bottom bar. */
export const shadow = {
  card: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
  cardLifted: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 6 },
  hero: { shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  button: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 13, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  lime: { shadowColor: '#bef03c', shadowOpacity: 0.55, shadowRadius: 17, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  sheet: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: -8 }, elevation: 16 },
  pill: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
} as const;

export const touch = { min: 48 } as const;
