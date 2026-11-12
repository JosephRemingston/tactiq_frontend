import { useEffect, type ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { T } from './Text';

/** design.md check: 18px filled disc with the tick cut out in the card colour. */
export function CheckDisc({ size = 18, color, tick, off }: { size?: number; color?: string; tick?: string; off?: boolean }) {
  const { c } = useTheme();
  const fill = color ?? c.ink;
  const cut = tick ?? c.surface;
  if (off) {
    return (
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Circle cx="10" cy="10" r="9.25" fill="none" stroke={fill} strokeWidth={1.5} opacity={0.5} />
        <Path d="M6.5 10h7" stroke={fill} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Circle cx="10" cy="10" r="10" fill={fill} />
      <Path d="M5.9 10.3 8.6 12.9 14.1 7.4" stroke={cut} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** design.md feature list row: disc + 14.5 text, 11 gap. */
export function CheckItem({ children, onHero, off }: { children: ReactNode; onHero?: boolean; off?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
      <CheckDisc color={onHero ? '#ffffff' : c.ink} tick={onHero ? c.hero : c.surface} off={off} />
      <T v="bodySm" tint={onHero ? c.heroInkSecondary : c.inkSecondary} style={{ fontSize: 14.5, flex: 1 }}>
        {children}
      </T>
    </View>
  );
}

/** design.md decorative wireframe glyph: outlined rounded squares, stroke 1.5. */
export function Deco({ width = 150, mirror, style }: { width?: number; mirror?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={[{ width, transform: mirror ? [{ scaleX: -1 }] : undefined }, style]}>
      <Svg width={width} height={(width * 236) / 178} viewBox="0 0 178 236" fill="none" stroke={c.deco} strokeWidth={1.5}>
        <Rect x="88" y="1" width="56" height="52" rx="13" />
        <Rect x="30" y="62" width="56" height="52" rx="13" />
        <Rect x="88" y="62" width="56" height="52" rx="13" />
        <Rect x="86" y="124" width="66" height="62" rx="15" />
        <Rect x="18" y="146" width="50" height="46" rx="12" />
      </Svg>
    </View>
  );
}

/** Skeleton block with a slow pulse (static under reduced motion). */
export function Skeleton({ w = '100%', h = 14, r = 8, style }: { w?: DimensionValue; h?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const { c, reduceMotion } = useTheme();
  const o = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion) o.set(withRepeat(withTiming(0.55, { duration: 900 }), -1, true));
  }, [reduceMotion, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: c.surfaceHigh }, a, style]} />;
}

export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ height: 1, backgroundColor: c.line, marginLeft: inset }, style]} />;
}

/** Section header: eyebrow-sized label + optional action. */
export function SectionHeader({ title, action, onAction, sub }: { title: string; action?: string; onAction?: () => void; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <T v="title" accessibilityRole="header">
          {title}
        </T>
        {sub ? (
          <T v="bodySm" color="muted" style={{ marginTop: 2 }}>
            {sub}
          </T>
        ) : null}
      </View>
      {action ? (
        <T v="labelSm" color="ink" onPress={onAction} accessibilityRole="button" style={{ textDecorationLine: 'underline', paddingVertical: 12 }} suppressHighlighting>
          {action}
        </T>
      ) : null}
    </View>
  );
}

/** Small round team swatch used inside chips and rows. Home is filled, away is outlined. */
export function Swatch({ side, size = 10 }: { side: 'home' | 'away'; size?: number }) {
  const { c } = useTheme();
  const col = side === 'home' ? c.home : c.away;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: side === 'home' ? col : 'transparent',
        borderWidth: side === 'home' ? 0 : 2,
        borderColor: col,
      }}
    />
  );
}

export function Row({ children, gap = 8, style, wrap }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Stack({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export const cardRadius = radius.card;
