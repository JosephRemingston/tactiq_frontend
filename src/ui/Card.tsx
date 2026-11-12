import type { ReactNode } from 'react';
import { StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, shadow, space } from '@/theme/tokens';
import { Glow } from './Glow';
import { Lift } from './motion';

export type CardVariant = 'light' | 'hero' | 'sponsored' | 'flat' | 'tint';

/**
 * design.md cards. `light`: white, hairline #efefef, soft long shadow. `hero`: #0c1112 with the
 * lime corner glow. `sponsored`: a different tint so ads never pass for content. `flat`: no shadow.
 */
export function Card({
  children,
  variant = 'light',
  glow = 0.62,
  padded = true,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
  onLongPress,
}: {
  children: ReactNode;
  variant?: CardVariant;
  glow?: number;
  padded?: boolean;
  onPress?: PressableProps['onPress'];
  onLongPress?: PressableProps['onLongPress'];
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { c, isDark } = useTheme();
  const base: ViewStyle = {
    borderRadius: radius.card,
    padding: padded ? space.xl : 0,
    overflow: 'hidden',
  };
  const look: ViewStyle =
    variant === 'hero'
      ? { backgroundColor: c.hero, borderWidth: isDark ? 1 : 0, borderColor: c.heroLine }
      : variant === 'sponsored'
        ? { backgroundColor: c.sponsored, borderWidth: 1, borderColor: c.sponsoredLine }
        : variant === 'tint'
          ? { backgroundColor: c.surfaceLow }
          : { backgroundColor: c.surface, borderWidth: 1, borderColor: c.cardLine };
  const elevation = variant === 'hero' ? shadow.hero : variant === 'light' && !isDark ? shadow.card : undefined;

  // Layout props (flex, width, margins…) belong on the outer wrapper so the card sizes in rows.
  const flat = StyleSheet.flatten(style) ?? {};
  const { flex, flexGrow, flexShrink, flexBasis, width, minWidth, maxWidth, alignSelf, margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, ...inner } = flat;
  const outer: ViewStyle = { flex, flexGrow, flexShrink, flexBasis, width, minWidth, maxWidth, alignSelf, margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical };
  const body = (
    <View style={[base, look, inner, (flex !== undefined || flexGrow !== undefined) && { flexGrow: 1 }]}>
      {variant === 'hero' && glow > 0 ? <Glow strength={glow} /> : null}
      {children}
    </View>
  );
  // Shadows live on an un-clipped wrapper so `overflow: hidden` can clip the glow.
  const wrapped = <View style={[{ borderRadius: radius.card }, elevation, !onPress && !onLongPress && outer]}>{body}</View>;
  if (!onPress && !onLongPress) return wrapped;
  return (
    <View style={outer}>
      <Lift kind="card" onPress={onPress} onLongPress={onLongPress} accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint}>
        {wrapped}
      </Lift>
    </View>
  );
}
