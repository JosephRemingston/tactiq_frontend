import { useEffect, useId } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { curves, motion } from '@/theme/motion';
import { T } from './Text';

/**
 * design.md knob: 22px, radial-gradient(120% 120% at 34% 26%, #fff, #dcdcdc 66%, #c6c6c6),
 * shadow 0 2px 5px rgba(0,0,0,.42).
 */
export function PearlKnob({ size = 22 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: '#000',
        shadowOpacity: 0.42,
        shadowRadius: 2.5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        backgroundColor: '#dcdcdc',
      }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`k${id}`} cx="0.34" cy="0.26" r="1.2" fx="0.34" fy="0.26">
            <Stop offset="0" stopColor="#ffffff" />
            <Stop offset="0.66" stopColor="#dcdcdc" />
            <Stop offset="1" stopColor="#c6c6c6" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#k${id})`} />
      </Svg>
    </View>
  );
}

function ToggleLabel({ text, active, ink, onPress }: { text: string; active: boolean; ink: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={text}>
      <T v="label" tint={ink} style={{ opacity: active ? 1 : motion.dim.opacity, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_500Medium', fontSize: 15 }}>
        {text}
      </T>
    </Pressable>
  );
}

/**
 * design.md switch: a dark 52×29 track (#1b1f21) whose pearly knob springs 23px with
 * cubic-bezier(.4,1.35,.5,1) over 280ms. Optional labels either side; the inactive one dims
 * to .45 / weight 500 over 250ms. role=switch, ←/→ semantics via accessibilityActions.
 */
export function Toggle({
  value,
  onChange,
  left,
  right,
  label,
  onHero,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  left?: string;
  right?: string;
  label: string;
  onHero?: boolean;
}) {
  const { c, isDark, reduceMotion } = useTheme();
  const x = useSharedValue(value ? 23 : 0);
  useEffect(() => {
    x.set(reduceMotion ? (value ? 23 : 0) : withTiming(value ? 23 : 0, { duration: motion.knob.duration, easing: curves.knob }));
  }, [value, reduceMotion, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  const set = (v: boolean) => {
    if (v === value) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(v);
  };
  const ink = onHero ? '#f2f5f6' : c.ink;
  // In dark mode the track lifts off the page slightly so it stays visible.
  const track = isDark || onHero ? '#262c2e' : '#1b1f21';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {left ? <ToggleLabel text={left} active={!value} ink={ink} onPress={() => set(false)} /> : null}
      <Pressable
        onPress={() => set(!value)}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => set(e.nativeEvent.actionName === 'increment')}
        hitSlop={10}
        style={{
          width: 52,
          height: 29,
          borderRadius: 999,
          backgroundColor: track,
          padding: 3.5,
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 9,
          shadowOffset: { width: 0, height: 8 },
          elevation: 2,
        }}>
        <Animated.View style={knob}>
          <PearlKnob />
        </Animated.View>
      </Pressable>
      {right ? <ToggleLabel text={right} active={value} ink={ink} onPress={() => set(true)} /> : null}
    </View>
  );
}
