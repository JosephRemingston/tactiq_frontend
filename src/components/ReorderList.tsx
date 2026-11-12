import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { curves } from '@/theme/motion';
import { IconButton } from '@/ui/Button';
import { Icon } from '@/ui/Icon';

const ROW = 68;

function Row<T>({
  item,
  index,
  count,
  active,
  dragY,
  hoverIndex,
  render,
  onStart,
  onEnd,
  onMoveBy,
}: {
  item: T;
  index: number;
  count: number;
  active: SharedValue<number>;
  dragY: SharedValue<number>;
  hoverIndex: SharedValue<number>;
  render: (item: T) => ReactNode;
  onStart: (i: number) => void;
  onEnd: (from: number, to: number) => void;
  onMoveBy: (i: number, d: number) => void;
}) {
  const { c } = useTheme();
  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      active.set(index);
      hoverIndex.set(index);
      scheduleOnRN(onStart, index);
    })
    .onChange((e) => {
      dragY.set(e.translationY);
      hoverIndex.set(Math.max(0, Math.min(count - 1, Math.round(index + e.translationY / ROW))));
    })
    .onEnd(() => {
      const to = hoverIndex.get();
      scheduleOnRN(onEnd, index, to);
    });
  const style = useAnimatedStyle(() => {
    if (active.get() === index) return { transform: [{ translateY: dragY.get() }, { scale: 1.02 }], zIndex: 10, shadowOpacity: 0.2 };
    let shift = 0;
    if (active.get() >= 0) {
      if (active.get() < index && hoverIndex.get() >= index) shift = -ROW;
      if (active.get() > index && hoverIndex.get() <= index) shift = ROW;
    }
    return { transform: [{ translateY: withTiming(shift, { duration: 200, easing: curves.settle }) }, { scale: 1 }], zIndex: 0, shadowOpacity: 0 };
  });
  return (
    <Animated.View style={[{ height: ROW, justifyContent: 'center', backgroundColor: c.surface, borderRadius: 14, shadowColor: '#000', shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4 }}>
        <GestureDetector gesture={pan}>
          <View accessibilityLabel="Drag to reorder" style={{ width: 44, height: ROW, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="drag_indicator" color={c.muted} />
          </View>
        </GestureDetector>
        <View style={{ flex: 1 }}>{render(item)}</View>
        {/* Buttons for users who can't drag (screen readers, switch access). */}
        <IconButton icon="arrow_upward" label="Move up" size={20} disabled={index === 0} onPress={() => onMoveBy(index, -1)} />
        <IconButton icon="arrow_downward" label="Move down" size={20} disabled={index === count - 1} onPress={() => onMoveBy(index, 1)} />
      </View>
    </Animated.View>
  );
}

/** Drag-to-reorder list with fixed-height rows; up/down buttons as the accessible alternative. */
export function ReorderList<T>({ items, keyOf, render, onReorder }: { items: T[]; keyOf: (t: T) => string; render: (t: T) => ReactNode; onReorder: (next: T[], moved: T, to: number) => void }) {
  const [list, setList] = useState(items);
  // Reset the local order when the items themselves change (derive-from-props, no effect).
  const sig = items.map(keyOf).join('|');
  const [prevSig, setPrevSig] = useState(sig);
  if (sig !== prevSig) {
    setPrevSig(sig);
    setList(items);
  }
  const active = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const hoverIndex = useSharedValue(-1);
  const move = (from: number, to: number) => {
    active.set(-1);
    dragY.set(0);
    hoverIndex.set(-1);
    if (from === to) return;
    const next = [...list];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setList(next);
    Haptics.selectionAsync().catch(() => {});
    onReorder(next, m, to);
  };
  return (
    <View style={{ gap: 0 }}>
      {list.map((it, i) => (
        <Row
          key={keyOf(it)}
          item={it}
          index={i}
          count={list.length}
          active={active}
          dragY={dragY}
          hoverIndex={hoverIndex}
          render={render}
          onStart={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})}
          onEnd={move}
          onMoveBy={(idx, d) => move(idx, idx + d)}
        />
      ))}
    </View>
  );
}
