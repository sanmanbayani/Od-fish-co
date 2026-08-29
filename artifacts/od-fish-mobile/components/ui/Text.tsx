import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { type } from '@/constants/typography';

type Variant = keyof typeof type;
type Tone = 'default' | 'muted' | 'inverse' | 'danger' | 'success' | 'primary';

export type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  uppercase?: boolean;
};

/**
 * Every piece of copy in the app goes through here so the brand faces are
 * applied consistently — React Native has no cascading font inheritance.
 */
export function Text({
  variant = 'body',
  tone = 'default',
  uppercase,
  style,
  ...rest
}: AppTextProps) {
  const colors = useColors();
  const toneColor = {
    default: colors.foreground,
    muted: colors.mutedForeground,
    inverse: colors.primaryForeground,
    danger: colors.destructive,
    success: colors.success,
    primary: colors.primary,
  }[tone];

  return (
    <RNText
      {...rest}
      style={[
        type[variant],
        { color: toneColor },
        uppercase && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}
