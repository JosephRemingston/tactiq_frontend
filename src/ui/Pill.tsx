import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, shadow } from '@/theme/tokens';
import { Icon } from './Icon';
import { T } from './Text';

export type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'inferred' | 'lime' | 'home' | 'away' | 'hero';

/**
 * design.md eyebrow pill: 30 high, white with hairline and a soft drop shadow, 10px bold
 * uppercase tracked .14em, optional leading icon.
 */
export function Eyebrow({ children, icon, style }: { children: ReactNode; icon?: string; style?: StyleProp<ViewStyle> }) {
  const { c, isDark } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 7,
          height: 30,
          paddingHorizontal: 14,
          borderRadius: radius.pill,
          backgroundColor: isDark ? c.surfaceMid : '#ffffff',
          borderWidth: 1,
          borderColor: c.line,
        },
        !isDark && shadow.pill,
        style,
      ]}>
      {icon ? <Icon name={icon} size={13} color={isDark ? c.inkSecondary : '#2c3033'} filled /> : null}
      <T v="eyebrow" tint={isDark ? c.inkSecondary : '#2c3033'}>
        {children}
      </T>
    </View>
  );
}

/** design.md tag pill: 26 high, 10.5 bold uppercase. Tones carry status meaning, never colour alone (icon + text). */
export function Tag({
  children,
  icon,
  tone = 'neutral',
  onHero,
  style,
  size = 'md',
  accessibilityLabel,
}: {
  children: ReactNode;
  icon?: string;
  tone?: Tone;
  onHero?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md';
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const tones: Record<Tone, { bg: string; fg: string; line?: string }> = {
    neutral: { bg: c.pill, fg: c.pillInk, line: c.name === 'dark' ? c.pillLine : undefined },
    success: { bg: c.successSoft, fg: c.success },
    warning: { bg: c.warningSoft, fg: c.warning },
    error: { bg: c.errorSoft, fg: c.error },
    inferred: { bg: c.inferredSoft, fg: c.inferred },
    lime: { bg: c.lime, fg: c.onLime },
    home: { bg: c.homeSoft, fg: c.home },
    away: { bg: c.awaySoft, fg: c.away },
    hero: { bg: 'rgba(255,255,255,0.07)', fg: '#eef3f4', line: 'rgba(255,255,255,0.14)' },
  };
  const t = onHero ? tones.hero : tones[tone];
  const h = size === 'sm' ? 22 : 26;
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 5,
          minHeight: h,
          paddingHorizontal: size === 'sm' ? 9 : 12,
          borderRadius: radius.pill,
          backgroundColor: t.bg,
          borderWidth: t.line ? 1 : 0,
          borderColor: t.line,
        },
        style,
      ]}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 12 : 13} color={t.fg} filled /> : null}
      <T v="tag" tint={t.fg} style={size === 'sm' ? { fontSize: 9.5 } : undefined} numberOfLines={1}>
        {children}
      </T>
    </View>
  );
}
