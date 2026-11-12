import { View } from 'react-native';

import { teamCode } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { T } from '@/ui/Text';

/**
 * Team identity without crests (licensing): initials in the match's team colour. Home is filled,
 * away is outlined, so the two never differ by colour alone.
 */
export function TeamBadge({ name, side, size = 36, onHero }: { name: string; side: 'home' | 'away'; size?: number; onHero?: boolean }) {
  const { c, isDark } = useTheme();
  const darkish = isDark || onHero;
  const col = side === 'home' ? (darkish ? '#6ea8ff' : c.home) : darkish ? '#ff9152' : c.away;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: side === 'home' ? col : 'transparent',
        borderWidth: side === 'home' ? 0 : 2,
        borderColor: col,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <T v="tag" tint={side === 'home' ? (darkish ? '#0b0d0e' : '#ffffff') : col} style={{ fontSize: size * 0.3, letterSpacing: 0.4 }} maxFontSizeMultiplier={1}>
        {teamCode(name)}
      </T>
    </View>
  );
}

/** Team chip: swatch + 3-letter code + name. */
export function TeamChip({ name, side, onHero, showName = true }: { name: string; side: 'home' | 'away'; onHero?: boolean; showName?: boolean }) {
  const { c, isDark } = useTheme();
  const darkish = isDark || onHero;
  const col = side === 'home' ? (darkish ? '#6ea8ff' : c.home) : darkish ? '#ff9152' : c.away;
  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${side === 'home' ? 'home' : 'away'}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        height: 26,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: onHero ? 'rgba(255,255,255,0.07)' : c.pill,
        borderWidth: onHero || isDark ? 1 : 0,
        borderColor: onHero ? 'rgba(255,255,255,0.14)' : c.pillLine,
      }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: side === 'home' ? col : 'transparent', borderWidth: side === 'home' ? 0 : 2, borderColor: col }} />
      <T v="tag" tint={onHero ? '#eef3f4' : c.pillInk}>
        {teamCode(name)}
      </T>
      {showName ? (
        <T v="caption" tint={onHero ? '#a9b0b3' : c.muted} numberOfLines={1}>
          {name}
        </T>
      ) : null}
    </View>
  );
}
