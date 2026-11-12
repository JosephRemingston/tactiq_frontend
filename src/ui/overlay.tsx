import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/theme/ThemeProvider';
import { curves, motion } from '@/theme/motion';
import { radius, shadow } from '@/theme/tokens';
import { Button, IconButton } from './Button';
import { T } from './Text';

type SheetSpec = { id: number; title?: string; content: ReactNode; full?: boolean };
type DialogSpec = {
  id: number;
  title: string;
  body?: string;
  confirm: string;
  cancel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  content?: ReactNode;
};
type SnackSpec = { id: number; text: string; action?: string; onAction?: () => void };

type OverlayApi = {
  openSheet: (content: ReactNode, opts?: { title?: string; full?: boolean }) => void;
  closeSheet: () => void;
  confirm: (d: Omit<DialogSpec, 'id'>) => void;
  closeDialog: () => void;
  snack: (text: string, action?: { label: string; onPress: () => void }) => void;
};

const Ctx = createContext<OverlayApi | null>(null);

export function useOverlay() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOverlay outside OverlayHost');
  return v;
}

let seq = 0;

export function OverlayHost({ children }: { children: ReactNode }) {
  const [sheets, setSheets] = useState<SheetSpec[]>([]);
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const [snack, setSnack] = useState<SnackSpec | null>(null);
  const closing = useRef<(() => void) | null>(null);

  const api = useMemo<OverlayApi>(
    () => ({
      openSheet: (content, opts) => setSheets((s) => [...s, { id: ++seq, content, title: opts?.title, full: opts?.full }]),
      closeSheet: () => {
        if (closing.current) closing.current();
        else setSheets((s) => s.slice(0, -1));
      },
      confirm: (d) => setDialog({ ...d, id: ++seq }),
      closeDialog: () => setDialog(null),
      snack: (text, action) => setSnack({ id: ++seq, text, action: action?.label, onAction: action?.onPress }),
    }),
    [],
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dialog) {
        dialog.onCancel?.();
        setDialog(null);
        return true;
      }
      if (sheets.length) {
        api.closeSheet();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [dialog, sheets.length, api]);

  const top = sheets[sheets.length - 1];
  return (
    <Ctx.Provider value={api}>
      {children}
      {top ? (
        <Sheet
          key={top.id}
          spec={top}
          register={(fn) => (closing.current = fn)}
          onClosed={() => {
            closing.current = null;
            setSheets((s) => s.filter((x) => x.id !== top.id));
          }}
        />
      ) : null}
      {dialog ? <Dialog spec={dialog} onClose={() => setDialog(null)} /> : null}
      {snack ? <Snackbar key={snack.id} spec={snack} onDone={() => setSnack((s) => (s?.id === snack.id ? null : s))} /> : null}
    </Ctx.Provider>
  );
}

function Sheet({ spec, onClosed, register }: { spec: SheetSpec; onClosed: () => void; register: (fn: () => void) => void }) {
  const { c, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const y = useSharedValue(height);
  const scrim = useSharedValue(0);
  const cfg = { duration: reduceMotion ? 0 : motion.sheet.duration, easing: curves.settle };

  const close = useCallback(() => {
    scrim.set(withTiming(0, cfg));
    y.set(
      withTiming(height, cfg, (done) => {
        if (done) scheduleOnRN(onClosed);
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, onClosed]);

  useEffect(() => {
    register(close);
    y.set(withTiming(0, cfg));
    scrim.set(withTiming(1, cfg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onChange((e) => {
      y.set(Math.max(0, y.get() + e.changeY));
    })
    .onEnd((e) => {
      if (y.get() > 120 || e.velocityY > 900) scheduleOnRN(close);
      else y.set(withTiming(0, { duration: 250, easing: curves.settle }));
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.get() }));

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, scrimStyle]}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close" accessibilityRole="button" />
      </Animated.View>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: spec.full ? height - insets.top - 12 : height * 0.86,
            minHeight: spec.full ? height - insets.top - 12 : undefined,
            backgroundColor: c.surface,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            borderWidth: c.name === 'dark' ? 1 : 0,
            borderColor: c.cardLine,
            paddingBottom: insets.bottom + 12,
          },
          shadow.sheet,
          sheetStyle,
        ]}>
        <GestureDetector gesture={pan}>
          <View style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 4 }}>
            <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: c.surfaceHigh }} />
            {spec.title ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <T v="title" style={{ flex: 1 }} accessibilityRole="header">
                  {spec.title}
                </T>
                <IconButton icon="close" label="Close" onPress={close} />
              </View>
            ) : null}
          </View>
        </GestureDetector>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }} bounces={false}>
          {spec.content}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function Dialog({ spec, onClose }: { spec: DialogSpec; onClose: () => void }) {
  const { c } = useTheme();
  const s = useSharedValue(0);
  useEffect(() => {
    s.set(withTiming(1, { duration: 250, easing: curves.settle }));
  }, [s]);
  const a = useAnimatedStyle(() => ({ opacity: s.get(), transform: [{ translateY: (1 - s.get()) * motion.rise.distance }] }));
  const scrim = useAnimatedStyle(() => ({ opacity: s.get() }));
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 24 }]} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, scrim]} />
      <Animated.View
        accessibilityRole="alert"
        style={[{ width: '100%', maxWidth: 420, backgroundColor: c.surface, borderRadius: radius.card, padding: 24, borderWidth: 1, borderColor: c.cardLine }, shadow.cardLifted, a]}>
        <T v="title">{spec.title}</T>
        {spec.body ? (
          <T v="body" color="inkSecondary" style={{ marginTop: 10 }}>
            {spec.body}
          </T>
        ) : null}
        {spec.content}
        <View style={{ gap: 10, marginTop: 22 }}>
          <Button
            label={spec.confirm}
            variant={spec.destructive ? 'destructive' : 'ink'}
            onPress={() => {
              onClose();
              spec.onConfirm?.();
            }}
          />
          {spec.cancel !== '' ? (
            <Button
              label={spec.cancel ?? 'Cancel'}
              variant="secondary"
              onPress={() => {
                onClose();
                spec.onCancel?.();
              }}
            />
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

function Snackbar({ spec, onDone }: { spec: SnackSpec; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const s = useSharedValue(0);
  useEffect(() => {
    s.set(withTiming(1, { duration: 250, easing: curves.settle }));
    const t = setTimeout(() => {
      s.set(
        withTiming(0, { duration: 250 }, (d) => {
          if (d) scheduleOnRN(onDone);
        }),
      );
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const a = useAnimatedStyle(() => ({ opacity: s.get(), transform: [{ translateY: (1 - s.get()) * 12 }] }));
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      pointerEvents="box-none"
      style={[{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 88 }, a]}>
      <View
        style={[
          { backgroundColor: '#0c1112', borderRadius: 14, paddingVertical: 12, paddingLeft: 16, paddingRight: 8, flexDirection: 'row', alignItems: 'center', minHeight: 52, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
          shadow.hero,
        ]}>
        <T v="bodySm" tint="#f2f5f6" style={{ flex: 1 }}>
          {spec.text}
        </T>
        {spec.action ? (
          <Pressable onPress={spec.onAction} hitSlop={8} accessibilityRole="button" style={{ paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' }}>
            <T v="labelSm" tint="#cdf348">
              {spec.action}
            </T>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
