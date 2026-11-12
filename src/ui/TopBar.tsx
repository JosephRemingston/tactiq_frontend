import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { IconButton } from './Button';
import { T } from './Text';

/** Top app bar: back, title, actions. Draws under the status bar (edge-to-edge). */
export function TopBar({
  title,
  back = true,
  actions,
  left,
  transparent,
  sub,
}: {
  title?: string;
  back?: boolean;
  actions?: ReactNode;
  left?: ReactNode;
  transparent?: boolean;
  sub?: string;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 4,
        paddingHorizontal: 6,
        paddingBottom: 4,
        backgroundColor: transparent ? 'transparent' : c.bg,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: insets.top + 56,
        gap: 2,
      }}>
      {left ?? (back ? <IconButton icon="arrow_back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : <View style={{ width: 10 }} />)}
      <View style={{ flex: 1, paddingHorizontal: 4 }}>
        {title ? (
          <T v="title" numberOfLines={1} accessibilityRole="header">
            {title}
          </T>
        ) : null}
        {sub ? (
          <T v="caption" color="muted" numberOfLines={1}>
            {sub}
          </T>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>{actions}</View>
    </View>
  );
}
