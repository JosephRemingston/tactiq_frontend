import { Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

/**
 * Material Symbols Rounded, rendered through the font's ligatures: `name` is the symbol's
 * snake_case name (e.g. "sports_soccer"). Decorative by default; pass `label` to announce it.
 */
export function Icon({
  name,
  size = 24,
  color,
  filled,
  label,
}: {
  name: string;
  size?: number;
  color?: string;
  filled?: boolean;
  label?: string;
}) {
  const { c } = useTheme();
  return (
    <Text
      allowFontScaling={false}
      accessible={!!label}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      style={{
        fontFamily: filled ? fonts.iconFilled : fonts.icon,
        fontSize: size,
        lineHeight: size,
        width: size,
        height: size,
        color: color ?? c.ink,
        textAlign: 'center',
        includeFontPadding: false,
      }}>
      {name}
    </Text>
  );
}
