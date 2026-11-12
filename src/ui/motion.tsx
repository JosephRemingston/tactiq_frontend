import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { curves, motion } from '@/theme/motion';

/** design.md settle-in: fade + 12px rise, 500ms, settle curve; delayed for the stagger. */
export function riseEntering(delay: number): EntryExitAnimationFunction {
  const duration = motion.rise.duration;
  const distance = motion.rise.distance;
  const easing = curves.settle;
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: distance }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration, easing })),
        transform: [{ translateY: withDelay(delay, withTiming(0, { duration, easing })) }],
      },
    };
  };
}

export function Rise({
  children,
  index = 0,
  delay,
  style,
}: {
  children: ReactNode;
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { reduceMotion } = useTheme();
  const d = delay ?? Math.min(index, 8) * motion.rise.stagger;
  if (reduceMotion) return <Animated.View style={style}>{children}</Animated.View>;
  return (
    // Reanimated's web build only runs predefined entering animations, so web falls back to FadeInDown.
    <Animated.View entering={Platform.OS === 'web' ? FadeInDown.duration(motion.rise.duration).delay(d).easing(curves.settle) : riseEntering(d)} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * design.md price swap: when `swapKey` changes, the content fades out with a 6px rise, is
 * rewritten at the half-fade (154ms) and fades back. Reduced motion swaps instantly.
 */
export function Swap({ swapKey, children, style }: { swapKey: string | number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { reduceMotion } = useTheme();
  // `shown` holds the key on screen and a snapshot of its content for the fade-out. While the
  // key matches, the live children render, so content updates without extra renders.
  const [shown, setShown] = useState({ key: swapKey, children });
  const o = useSharedValue(1);
  const y = useSharedValue(0);

  useEffect(() => {
    if (swapKey === shown.key) return;
    if (reduceMotion) {
      const t0 = setTimeout(() => setShown({ key: swapKey, children }), 0);
      return () => clearTimeout(t0);
    }
    const cfg = { duration: motion.swap.duration, easing: curves.ease };
    o.set(withTiming(0, cfg));
    y.set(withTiming(-motion.swap.distance, cfg));
    const t = setTimeout(() => {
      setShown({ key: swapKey, children });
      o.set(withTiming(1, cfg));
      y.set(withTiming(0, cfg));
    }, motion.swap.half);
    return () => clearTimeout(t);
    // Children are read at swap time on purpose; only a key change starts a swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapKey, reduceMotion]);

  const a = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ translateY: y.get() }] }));
  const content = reduceMotion || swapKey === shown.key ? children : shown.children;
  return <Animated.View style={[style, a]}>{content}</Animated.View>;
}

/**
 * Press feedback translated from design.md hover: cards lift 4px over 350ms, buttons 2px over
 * 250ms and brighten. Light haptic on press.
 */
export function Lift({
  children,
  kind = 'card',
  style,
  haptic = true,
  ...rest
}: PressableProps & { children: ReactNode; kind?: 'card' | 'button' | 'none'; style?: StyleProp<ViewStyle>; haptic?: boolean }) {
  const { reduceMotion } = useTheme();
  const p = useSharedValue(0);
  const cfg = kind === 'card' ? motion.cardLift : motion.buttonLift;
  const easing = kind === 'card' ? curves.settle : curves.ease;
  const a = useAnimatedStyle(() => ({
    transform: [{ translateY: -cfg.distance * p.get() }],
    opacity: kind === 'button' ? 1 - 0.06 * p.get() : 1,
  }));
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => {
        if (!reduceMotion && kind !== 'none') p.set(withTiming(1, { duration: cfg.duration, easing }));
        if (haptic) Haptics.selectionAsync().catch(() => {});
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        p.set(withTiming(0, { duration: cfg.duration, easing }));
        rest.onPressOut?.(e);
      }}>
      <Animated.View style={[style, a]}>{children}</Animated.View>
    </Pressable>
  );
}
