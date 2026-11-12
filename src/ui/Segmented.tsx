import { useEffect, useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { curves, motion } from '@/theme/motion';
import { Icon } from './Icon';
import { T } from './Text';

export type SegOption<V extends string> = { value: V; label: string; locked?: boolean };

/**
 * Segmented control in design.md's switch language: the dark #1b1f21 track with a pearly pill
 * that springs to the selected segment (knob curve, 280ms). Inactive labels dim to .45.
 * Used for the depth switch (Quick / Explore / Advanced), scope switches and home / away.
 */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  style,
}: {
  options: SegOption<V>[];
  value: V;
  onChange: (v: V) => void;
  label: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark, reduceMotion } = useTheme();
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const seg = w > 0 ? (w - 7) / options.length : 0;
  const x = useSharedValue(0);
  useEffect(() => {
    const to = idx * seg;
    x.set(reduceMotion || seg === 0 ? to : withTiming(to, { duration: motion.knob.duration, easing: curves.knob }));
  }, [idx, seg, reduceMotion, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }], width: seg }));
  const h = size === 'sm' ? 36 : 42;

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        {
          height: h,
          borderRadius: 999,
          backgroundColor: isDark ? '#1f2628' : '#1b1f21',
          padding: 3.5,
          flexDirection: 'row',
          shadowColor: '#000',
          shadowOpacity: isDark ? 0 : 0.35,
          shadowRadius: 9,
          shadowOffset: { width: 0, height: 8 },
          elevation: isDark ? 0 : 2,
        },
        style,
      ]}>
      {seg > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 3.5,
              left: 3.5,
              bottom: 3.5,
              borderRadius: 999,
              backgroundColor: '#f4f4f4',
              experimental_backgroundImage: 'radial-gradient(120% 120% at 34% 26%, #ffffff, #e6e6e6 66%, #d2d2d2)',
              shadowColor: '#000',
              shadowOpacity: 0.42,
              shadowRadius: 2.5,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            },
            pill,
          ]}
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (!active) {
                Haptics.selectionAsync().catch(() => {});
                onChange(o.value);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.locked ? `${o.label}, Pro` : o.label}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, minHeight: 44, marginVertical: -7 }}>
            {o.locked ? <Icon name="lock" size={13} color={active ? '#0b0d0e' : '#f2f5f6'} /> : null}
            <T
              v="labelSm"
              tint={active ? '#0b0d0e' : '#f2f5f6'}
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
              style={{ opacity: active ? 1 : 0.62, fontSize: size === 'sm' ? 12.5 : 13.5 }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
