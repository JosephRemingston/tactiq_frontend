import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';
import { T } from './Text';

export type BannerTone = 'error' | 'warning' | 'success' | 'info' | 'inferred';

/** Inline status banner: icon + text, never colour alone. */
export function Banner({ tone = 'info', title, children, icon, action }: { tone?: BannerTone; title?: string; children?: ReactNode; icon?: string; action?: ReactNode }) {
  const { c } = useTheme();
  const map = {
    error: { bg: c.errorSoft, fg: c.error, icon: 'error' },
    warning: { bg: c.warningSoft, fg: c.warning, icon: 'warning' },
    success: { bg: c.successSoft, fg: c.success, icon: 'check_circle' },
    info: { bg: c.surfaceLow, fg: c.ink, icon: 'info' },
    inferred: { bg: c.inferredSoft, fg: c.inferred, icon: 'psychology' },
  }[tone];
  return (
    <Animated.View entering={FadeIn.duration(250)} accessibilityRole="alert" style={{ backgroundColor: map.bg, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10 }}>
      <Icon name={icon ?? map.icon} size={20} color={map.fg} filled />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <T v="labelSm" tint={tone === 'info' ? c.ink : map.fg}>
            {title}
          </T>
        ) : null}
        {typeof children === 'string' ? (
          <T v="bodySm" color="inkSecondary">
            {children}
          </T>
        ) : (
          children
        )}
        {action}
      </View>
    </Animated.View>
  );
}
