import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, View, type LayoutRectangle, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { curves, motion } from '@/theme/motion';
import { Icon } from './Icon';
import { T } from './Text';

export type TabDef<V extends string> = { value: V; label: string; locked?: boolean; badge?: string };

/**
 * Text tabs with a sliding indicator (knob curve). Ink indicator in light (lime fails 3:1 on
 * white), lime in dark. Scrolls horizontally when tabs overflow.
 */
export function Tabs<V extends string>({
  tabs,
  value,
  onChange,
  style,
  onHero,
}: {
  tabs: TabDef<V>[];
  value: V;
  onChange: (v: V) => void;
  style?: StyleProp<ViewStyle>;
  onHero?: boolean;
}) {
  const { c, isDark, reduceMotion } = useTheme();
  const [lay, setLay] = useState<Record<string, LayoutRectangle>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    const l = lay[value];
    if (!l) return;
    const cfg = { duration: reduceMotion ? 0 : motion.knob.duration, easing: curves.knob };
    x.set(withTiming(l.x + 12, cfg));
    w.set(withTiming(l.width - 24, cfg));
    scroll.current?.scrollTo({ x: Math.max(0, l.x - 40), animated: !reduceMotion });
  }, [value, lay, reduceMotion, x, w]);
  const ind = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }], width: w.get() }));
  const ink = onHero ? '#f2f5f6' : c.ink;
  const indColor = onHero || isDark ? c.lime : c.ink;
  return (
    <View style={[{ borderBottomWidth: 1, borderColor: onHero ? 'rgba(255,255,255,0.1)' : c.line }, style]}>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist">
        <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
          {tabs.map((t) => {
            const active = t.value === value;
            return (
              <Pressable
                key={t.value}
                onLayout={(e) => {
                  const l = e.nativeEvent.layout;
                  setLay((cur) => ({ ...cur, [t.value]: l }));
                }}
                onPress={() => {
                  if (!active) {
                    Haptics.selectionAsync().catch(() => {});
                    onChange(t.value);
                  }
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t.locked ? `${t.label}, needs sign-in or Pro` : t.label}
                style={{ paddingHorizontal: 12, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {t.locked ? <Icon name="lock" size={14} color={onHero ? '#a9b0b3' : c.muted} /> : null}
                <T v="label" tint={ink} style={{ opacity: active ? 1 : 0.55, fontFamily: active ? 'Inter_700Bold' : 'Inter_500Medium' }} maxFontSizeMultiplier={1.4}>
                  {t.label}
                </T>
                {t.badge ? (
                  <View style={{ paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: c.lime, justifyContent: 'center' }}>
                    <T v="caption" tint={c.onLime} style={{ fontSize: 10.5 }}>
                      {t.badge}
                    </T>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, height: 3, borderRadius: 2, backgroundColor: indColor }, ind]} />
        </View>
      </ScrollView>
    </View>
  );
}
