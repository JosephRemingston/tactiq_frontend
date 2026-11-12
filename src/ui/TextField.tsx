import { useState, type ComponentRef, type Ref } from 'react';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Icon } from './Icon';
import { T } from './Text';

export type FieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: string;
  /** Shows "n / max" under the field. */
  counter?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  trailing?: React.ReactNode;
};

/** Text field: 12 radius, hairline border that turns ink on focus and red on error. */
export function TextField({
  label,
  hint,
  error,
  icon,
  counter,
  containerStyle,
  trailing,
  multiline,
  maxLength,
  value,
  style,
  onFocus,
  onBlur,
  ref,
  ...rest
}: FieldProps & { ref?: Ref<ComponentRef<typeof TextInput>> }) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  const border = error ? c.error : focus ? c.ink : c.line;
  return (
    <View style={containerStyle}>
      {label ? (
        <T v="labelSm" style={{ marginBottom: 8 }}>
          {label}
        </T>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: 10,
          minHeight: 50,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          borderRadius: radius.input,
          borderWidth: focus || error ? 1.5 : 1,
          borderColor: border,
          backgroundColor: c.surface,
        }}>
        {icon ? <Icon name={icon} size={20} color={c.muted} /> : null}
        <TextInput
          ref={ref}
          value={value}
          multiline={multiline}
          maxLength={maxLength}
          placeholderTextColor={c.faint}
          selectionColor={c.limeDeep}
          cursorColor={c.ink}
          maxFontSizeMultiplier={2}
          onFocus={(e) => {
            setFocus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label ?? rest.placeholder}
          accessibilityHint={error ?? hint}
          style={[
            {
              flex: 1,
              fontFamily: fonts.regular,
              fontSize: 15,
              color: c.ink,
              paddingVertical: multiline ? 0 : 12,
              textAlignVertical: multiline ? 'top' : 'center',
              minHeight: multiline ? 160 : undefined,
            },
            style,
          ]}
          {...rest}
        />
        {trailing}
      </View>
      <View style={{ flexDirection: 'row', marginTop: error || hint || counter ? 6 : 0, gap: 8 }}>
        {error ? (
          <T v="caption" color="error" style={{ flex: 1 }} accessibilityLiveRegion="polite">
            {error}
          </T>
        ) : hint ? (
          <T v="caption" color="muted" style={{ flex: 1 }}>
            {hint}
          </T>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {counter && maxLength ? (
          <T v="caption" color={(value?.length ?? 0) > maxLength * 0.95 ? 'warning' : 'muted'} num>
            {(value?.length ?? 0).toLocaleString('en-GB')} / {maxLength.toLocaleString('en-GB')}
          </T>
        ) : null}
      </View>
    </View>
  );
}
