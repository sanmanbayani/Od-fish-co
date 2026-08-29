import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';

export function Card({
  children,
  style,
  padded = true,
  tone = 'card',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  tone?: 'card' | 'accent' | 'deep';
}) {
  const colors = useColors();
  const bg =
    tone === 'accent'
      ? colors.accent
      : tone === 'deep'
        ? colors.deep
        : colors.card;
  const border = tone === 'deep' ? colors.deep : colors.border;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: radii.xl,
          padding: padded ? spacing.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
