import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, shadow } from '@/theme/tokens';
import { Icon } from './Icon';
import { Lift } from './motion';
import { T } from './Text';

export type ButtonVariant = 'primary' | 'ink' | 'secondary' | 'text' | 'destructive' | 'onHero';

/** design.md chevron (12×12, stroke 1.8). */
export function Chevron({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path d="M4.3 1.8 8.5 6l-4.2 4.2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * design.md CTAs. `primary`: lime gradient (100deg, #a9dd28 → #cdf348 52% → #dffb72) with the round
 * chevron disc and a lime shadow. `ink`: the light card's #0d1214 button (inverted in dark).
 * 50 high on phones (design.md ≤640px step), radius 12, 14.5 / 600.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  chevron,
  loading,
  disabled,
  compact,
  full = true,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: string;
  chevron?: boolean;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const { c, isDark } = useTheme();
  const h = compact ? 40 : 50;
  const showChevron = chevron ?? variant === 'primary';

  const fg =
    variant === 'primary'
      ? '#101a05'
      : variant === 'ink'
        ? isDark
          ? '#0b0d0e'
          : '#ffffff'
        : variant === 'destructive'
          ? '#ffffff'
          : variant === 'onHero'
            ? '#f2f5f6'
            : c.ink;

  const box: ViewStyle = {
    height: h,
    minWidth: 48,
    borderRadius: radius.button,
    paddingHorizontal: compact ? 16 : 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: full ? 'stretch' : 'flex-start',
    overflow: 'hidden',
  };
  const look: ViewStyle =
    variant === 'ink'
      ? { backgroundColor: isDark ? '#f2f5f6' : '#0d1214' }
      : variant === 'secondary'
        ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: isDark ? c.pillLine : '#d9dcde' }
        : variant === 'destructive'
          ? { backgroundColor: c.error }
          : variant === 'onHero'
            ? { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }
            : { backgroundColor: 'transparent' };
  const lift = variant === 'primary' ? shadow.lime : variant === 'ink' && !isDark ? shadow.button : undefined;

  const content = (
    <>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <T v="label" tint={fg} numberOfLines={1} style={showChevron ? { marginHorizontal: 30 } : undefined}>
        {label}
      </T>
      {showChevron ? (
        <View
          style={{
            position: 'absolute',
            right: 7,
            width: compact ? 28 : 32,
            height: compact ? 28 : 32,
            borderRadius: 16,
            backgroundColor: variant === 'primary' ? 'rgba(12,18,4,0.07)' : 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            borderColor: variant === 'primary' ? 'rgba(12,18,4,0.28)' : 'rgba(255,255,255,0.28)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Chevron color={fg} />
        </View>
      ) : null}
    </>
  );

  return (
    <Lift
      kind="button"
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={[full ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }, { opacity: disabled ? 0.45 : 1 }, style]}>
      <View style={[{ borderRadius: radius.button }, lift]}>
        {variant === 'primary' ? (
          <LinearGradient
            colors={['#a9dd28', '#cdf348', '#dffb72']}
            locations={[0, 0.52, 1]}
            start={{ x: 0, y: 0.41 }}
            end={{ x: 1, y: 0.59 }}
            style={box}>
            {content}
          </LinearGradient>
        ) : (
          <View style={[box, look]}>{content}</View>
        )}
      </View>
    </Lift>
  );
}

/** Round 48dp icon button for top bars and card actions. */
export function IconButton({
  icon,
  label,
  onPress,
  color,
  filled,
  size = 24,
  disabled,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  color?: string;
  filled?: boolean;
  size?: number;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Lift
      kind="none"
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      hitSlop={4}
      style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
      <Icon name={icon} size={size} color={color ?? c.ink} filled={filled} />
    </Lift>
  );
}
