import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { curves } from '@/theme/motion';
import { radius } from '@/theme/tokens';
import { Icon } from './Icon';
import { Lift } from './motion';
import { T } from './Text';

/**
 * Selectable chip: full round, hairline when off; ink fill with a check when on (lime in dark).
 * `locked` shows a lock (Pro-only filters) and is announced as such.
 */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  locked,
  count,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  locked?: boolean;
  count?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, isDark } = useTheme();
  const onBg = isDark ? c.lime : c.ink;
  const onFg = isDark ? c.onLime : '#ffffff';
  const fill = useAnimatedStyle(() => ({ opacity: withTiming(selected ? 1 : 0, { duration: 150, easing: curves.ease }) }));
  return (
    <Lift
      kind="none"
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
      accessibilityLabel={locked ? `${label}, Pro feature` : label}
      style={[
        {
          minHeight: 40,
          paddingHorizontal: 14,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: selected ? onBg : c.line,
          backgroundColor: c.surface,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          overflow: 'hidden',
        },
        style,
      ]}>
      <Animated.View style={[{ position: 'absolute', inset: 0, backgroundColor: onBg }, fill]} />
      {selected ? <Icon name="check" size={16} color={onFg} /> : locked ? <Icon name="lock" size={15} color={c.muted} /> : icon ? <Icon name={icon} size={16} color={c.ink} /> : null}
      <T v="labelSm" tint={selected ? onFg : c.ink}>
        {label}
      </T>
      {count !== undefined ? (
        <T v="caption" tint={selected ? onFg : c.muted} num>
          {count}
        </T>
      ) : null}
    </Lift>
  );
}

/** Horizontal filter-chip bar. */
export function ChipBar({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} style={[{ marginHorizontal: -16, flexGrow: 0 }, style]}>
      {children}
    </ScrollView>
  );
}

export function ChipWrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}
