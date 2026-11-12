import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { gutter } from '@/theme/tokens';

/**
 * Edge-to-edge screen: draws under the system bars and pads content by the insets.
 * `scroll` wraps the body in a ScrollView with 16dp gutters and optional pull to refresh.
 */
export function Screen({
  children,
  scroll = true,
  header,
  footer,
  padTop = true,
  refreshing,
  onRefresh,
  contentStyle,
  scrollProps,
  bottomInset = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  padTop?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: ScrollViewProps;
  bottomInset?: boolean;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const top = header ? 0 : padTop ? insets.top : 0;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {header}
      {scroll ? (
        <ScrollView
          {...scrollProps}
          style={{ flex: 1 }}
          contentContainerStyle={[
            { paddingTop: top + 8, paddingHorizontal: gutter, paddingBottom: (bottomInset ? insets.bottom : 0) + 32 },
            contentStyle,
          ]}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.ink} colors={[c.onLime]} progressBackgroundColor={c.lime} /> : undefined}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingTop: top }, contentStyle]}>{children}</View>
      )}
      {footer}
    </View>
  );
}
