import { Tabs } from 'expo-router/js-tabs';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { OfflineBanner } from '@/components/states';
import { DevFab } from '@/dev/DevFab';
import { useSignedIn } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { curves } from '@/theme/motion';
import { shadow } from '@/theme/tokens';
import { Icon } from '@/ui/Icon';
import { T } from '@/ui/Text';

const TABS: Record<string, { label: string; icon: string; signedOut?: { label: string; icon: string } }> = {
  home: { label: 'Home', icon: 'home', signedOut: { label: 'Sign in', icon: 'login' } },
  explore: { label: 'Explore', icon: 'explore' },
  learn: { label: 'Learn', icon: 'school' },
  library: { label: 'Library', icon: 'bookmarks' },
};

function TabItem({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const signedIn = useSignedIn();
  const def = TABS[name] ?? { label: name, icon: 'circle' };
  const shown = !signedIn && def.signedOut ? def.signedOut : def;
  const ind = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: 250, easing: curves.settle }),
    transform: [{ scaleX: withTiming(focused ? 1 : 0.6, { duration: 280, easing: curves.knob }) }],
  }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={shown.label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 6, gap: 4, minHeight: 56 }}>
      <View style={{ width: 60, height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ position: 'absolute', inset: 0, borderRadius: 16, backgroundColor: c.lime }, ind]} />
        <Icon name={shown.icon} size={22} filled={focused} color={focused ? c.onLime : c.muted} />
      </View>
      <T v="caption" tint={focused ? c.ink : c.muted} style={{ fontFamily: focused ? 'Inter_600SemiBold' : 'Inter_500Medium' }} maxFontSizeMultiplier={1.3} numberOfLines={1}>
        {shown.label}
      </T>
    </Pressable>
  );
}

function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { c, isDark } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: 'row',
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderColor: c.line,
          paddingBottom: insets.bottom,
          paddingHorizontal: 8,
        },
        !isDark && shadow.sheet,
        !isDark && { shadowOpacity: 0.06 },
      ]}>
      {state.routes.map((r, i) => (
        <TabItem
          key={r.key}
          name={r.name}
          focused={state.index === i}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            navigateToTab(r.key);
          }}
        />
      ))}
    </View>
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg }, animation: 'fade' }}>
        <Tabs.Screen name="home" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="learn" />
        <Tabs.Screen name="library" />
      </Tabs>
      <OfflineBanner />
      <DevFab />
    </View>
  );
}
