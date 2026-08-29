import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { radii } from '@/constants/colors';
import { Text } from '@/components/ui/Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const SIZES: Record<Size, { height: number; padding: number; font: number }> = {
  sm: { height: 36, padding: 14, font: 13 },
  md: { height: 46, padding: 18, font: 14.5 },
  lg: { height: 54, padding: 22, font: 15.5 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  icon,
  trailing,
  style,
  testID,
}: ButtonProps) {
  const colors = useColors();
  const dims = SIZES[size];
  const isDisabled = disabled || loading;

  const palette: Record<
    Variant,
    { bg: string; fg: string; border: string }
  > = {
    primary: {
      bg: colors.primary,
      fg: colors.primaryForeground,
      border: colors.primary,
    },
    secondary: {
      bg: colors.secondary,
      fg: colors.secondaryForeground,
      border: colors.secondary,
    },
    outline: {
      bg: 'transparent',
      fg: colors.foreground,
      border: colors.border,
    },
    ghost: { bg: 'transparent', fg: colors.foreground, border: 'transparent' },
    danger: {
      bg: colors.destructive,
      fg: colors.destructiveForeground,
      border: colors.destructive,
    },
  };
  const tone = palette[variant];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
      disabled={isDisabled}
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height: dims.height,
          paddingHorizontal: dims.padding,
          backgroundColor: tone.bg,
          borderColor: tone.border,
          borderRadius: radii.lg,
          opacity: isDisabled ? 0.45 : pressed ? 0.82 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tone.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text
            variant="bodySemi"
            style={{ color: tone.fg, fontSize: dims.font, letterSpacing: 0.2 }}
          >
            {label}
          </Text>
          {trailing}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
