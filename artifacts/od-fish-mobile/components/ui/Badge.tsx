import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { radii } from '@/constants/colors';
import { Text } from '@/components/ui/Text';

type Tone = 'neutral' | 'success' | 'danger' | 'navy' | 'warning';

export function Badge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();

  const map: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: colors.secondary, fg: colors.mutedForeground },
    success: { bg: 'rgba(18,113,95,0.12)', fg: colors.success },
    danger: { bg: 'rgba(207,23,54,0.10)', fg: colors.destructive },
    navy: { bg: colors.primary, fg: colors.primaryForeground },
    warning: { bg: 'rgba(180,110,20,0.12)', fg: '#8A5A12' },
  };
  const tones = map[tone];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: tones.bg, borderRadius: radii.sm },
        style,
      ]}
    >
      <Text variant="tiny" uppercase style={{ color: tones.fg, letterSpacing: 0.7 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
});
