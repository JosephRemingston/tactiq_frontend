import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { T } from './Text';

/** Mark: a three-node passing network with one lime node (the ball carrier). */
export function Mark({ size = 28, ink, lime = '#cdf348' }: { size?: number; ink?: string; lime?: string }) {
  const { c } = useTheme();
  const col = ink ?? c.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Line x1="6" y1="20" x2="14" y2="7" stroke={col} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1="14" y1="7" x2="22" y2="19" stroke={col} strokeWidth={2.2} strokeLinecap="round" opacity={0.55} />
      <Line x1="6" y1="20" x2="22" y2="19" stroke={col} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx="6" cy="20" r="3.6" fill={col} />
      <Circle cx="22" cy="19" r="3.6" fill="none" stroke={col} strokeWidth={2} />
      <Circle cx="14" cy="7" r="4.4" fill={lime} stroke={col} strokeWidth={1.4} />
    </Svg>
  );
}

export function Wordmark({ size = 22, ink }: { size?: number; ink?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.32 }} accessible accessibilityRole="header" accessibilityLabel="Tactiq">
      <Mark size={size * 1.25} ink={ink} />
      <T v="display" tint={ink ?? c.ink} style={{ fontSize: size, lineHeight: size * 1.1, letterSpacing: -size * 0.045 }} maxFontSizeMultiplier={1.2}>
        tactiq
      </T>
    </View>
  );
}
