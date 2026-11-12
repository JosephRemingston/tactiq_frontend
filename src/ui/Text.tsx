import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { Palette } from '@/theme/tokens';
import { type as typeScale, type TypeVariant } from '@/theme/typography';

type ColorKey = { [K in keyof Palette]: Palette[K] extends string ? K : never }[keyof Palette];

export type TProps = TextProps & {
  v?: TypeVariant;
  color?: ColorKey;
  /** Raw colour, wins over `color`. */
  tint?: string;
  align?: TextStyle['textAlign'];
  num?: boolean;
};

/** All app text. Holds at 200% font scale (maxFontSizeMultiplier 2). */
export function T({ v = 'body', color = 'ink', tint, align, num, style, maxFontSizeMultiplier = 2, ...rest }: TProps) {
  const { c } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[typeScale[v], { color: tint ?? c[color] }, align && { textAlign: align }, num && { fontVariant: ['tabular-nums'] }, style]}
      {...rest}
    />
  );
}
