import type { TextStyle } from 'react-native';

/**
 * design.md type: Inter Tight 800 for display (tight negative tracking), Inter for UI.
 * Sizes are design.md's phone step (h1 32, price 36, lede 14.5–15.5, feat-h 16, list 14.5,
 * eyebrow 10 / .14em, tag 9.5 / .13em). Tags are raised to 10.5 for legibility.
 * Every number uses tabular figures (`num` variants).
 */
export const fonts = {
  display: 'InterTight_800ExtraBold',
  displayBold: 'InterTight_700Bold',
  displaySemi: 'InterTight_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  icon: 'MaterialSymbolsRounded_400Regular',
  iconFilled: 'MaterialSymbolsRounded_400Regular_Filled',
} as const;

const em = (size: number, value: number) => Math.round(size * value * 100) / 100;

export type TypeVariant =
  | 'display'
  | 'score'
  | 'headline'
  | 'title'
  | 'titleSm'
  | 'body'
  | 'bodyStrong'
  | 'bodySm'
  | 'label'
  | 'labelSm'
  | 'caption'
  | 'eyebrow'
  | 'tag'
  | 'number'
  | 'numberLg';

export const type: Record<TypeVariant, TextStyle> = {
  // design.md h2 at phone width: 32 / 1.0, 800, -.03em
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 34, letterSpacing: em(32, -0.03) },
  // design.md price: 36 / 1, 800, -.036em, slightly condensed by tracking
  score: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: em(40, -0.036), fontVariant: ['tabular-nums'] },
  headline: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: em(24, -0.03) },
  title: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24, letterSpacing: em(19, -0.02) },
  // design.md feat-h: 16 / 1.3, 600, -.01em
  titleSm: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, letterSpacing: em(16, -0.01) },
  // design.md lede: 14.5–15.5 / 1.55
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 23 },
  bodySm: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  // design.md cta / switch label: 14.5–15, 600
  label: { fontFamily: fonts.semibold, fontSize: 14.5, lineHeight: 20, letterSpacing: em(14.5, -0.005) },
  labelSm: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  // design.md eyebrow: 10, 700, .14em, uppercase
  eyebrow: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, letterSpacing: em(10, 0.14), textTransform: 'uppercase' },
  // design.md tag: 9.5 → 10.5, 700, .13em, uppercase
  tag: { fontFamily: fonts.bold, fontSize: 10.5, lineHeight: 14, letterSpacing: em(10.5, 0.12), textTransform: 'uppercase' },
  number: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
  numberLg: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30, letterSpacing: em(28, -0.036), fontVariant: ['tabular-nums'] },
};
