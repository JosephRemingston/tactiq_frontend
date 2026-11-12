import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * design.md's dark-card glow, the `::before` layer:
 *   radial-gradient(86% 78% at 0% 108%,  lime·g 0%, lime·g·.34 40%, transparent 70%)
 *   radial-gradient(58% 62% at 56% 122%, lime·g·.30 0%, transparent 72%)
 * with g = 0.62. `strength` scales g (the score header uses a quieter glow).
 */
export function Glow({ strength = 0.62, color = '#cdf348' }: { strength?: number; color?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={`a${id}`} cx="0" cy="1.08" rx="0.86" ry="0.78" fx="0" fy="1.08" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor={color} stopOpacity={strength} />
            <Stop offset="0.4" stopColor={color} stopOpacity={strength * 0.34} />
            <Stop offset="0.7" stopColor={color} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`b${id}`} cx="0.56" cy="1.22" rx="0.58" ry="0.62" fx="0.56" fy="1.22" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor={color} stopOpacity={strength * 0.3} />
            <Stop offset="0.72" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#a${id})`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#b${id})`} />
      </Svg>
    </View>
  );
}
