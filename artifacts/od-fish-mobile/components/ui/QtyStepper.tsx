import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { radii } from '@/constants/colors';
import { Text } from '@/components/ui/Text';

export function QtyStepper({
  quantity,
  onChange,
  min = 0,
  max = 20,
  busy,
  compact,
}: {
  quantity: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  busy?: boolean;
  compact?: boolean;
}) {
  const colors = useColors();
  const size = compact ? 28 : 34;

  const step = (delta: number) => {
    const next = quantity + delta;
    if (next < min || next > max) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onChange(next);
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: colors.primary,
          borderRadius: radii.lg,
          backgroundColor: colors.card,
          height: size + 4,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        onPress={() => step(-1)}
        disabled={busy || quantity <= min}
        style={[styles.btn, { width: size, opacity: quantity <= min ? 0.35 : 1 }]}
      >
        <Feather
          name={quantity === 1 ? 'trash-2' : 'minus'}
          size={compact ? 13 : 15}
          color={colors.primary}
        />
      </Pressable>
      <View style={[styles.value, { minWidth: compact ? 22 : 28 }]}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text variant="bodySemi" tone="primary" style={{ fontSize: compact ? 13 : 15 }}>
            {quantity}
          </Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        onPress={() => step(1)}
        disabled={busy || quantity >= max}
        style={[styles.btn, { width: size, opacity: quantity >= max ? 0.35 : 1 }]}
      >
        <Feather name="plus" size={compact ? 13 : 15} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  btn: { alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  value: { alignItems: 'center', justifyContent: 'center' },
});
