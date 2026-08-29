import React from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { radii } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Text } from '@/components/ui/Text';

export type TextFieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
  prefix?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  hint,
  error,
  prefix,
  containerStyle,
  style,
  ...rest
}: TextFieldProps) {
  const colors = useColors();
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="label" tone="muted" uppercase style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.card,
            borderColor: error
              ? colors.destructive
              : focused
                ? colors.primary
                : colors.border,
            borderRadius: radii.lg,
          },
        ]}
      >
        {prefix ? (
          <Text variant="bodyMedium" tone="muted" style={styles.prefix}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            { color: colors.foreground, fontFamily: fonts.body },
            style,
          ]}
        />
      </View>
      {error ? (
        <Text variant="small" tone="danger" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" tone="muted" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  prefix: { marginRight: 6 },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  helper: { marginTop: 5 },
});
