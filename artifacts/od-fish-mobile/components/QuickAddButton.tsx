import React from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Product } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { deepInk, radii } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Text } from '@/components/ui/Text';
import { useQuickAdd } from '@/lib/quickCart';

const SIZE = 32;

/**
 * The (+) on a product card. Once the default pack is in the basket it turns
 * into a filled "− qty +" counter. Taps never reach the card underneath, so
 * adding never opens the product page.
 */
export function QuickAddButton({ product }: { product: Product }) {
  const colors = useColors();
  const { quantity, available, atMax, increment, decrement } = useQuickAdd(product);

  if (!available && quantity === 0) return null;

  const tap = (fn: () => void) => (e: GestureResponderEvent) => {
    e?.stopPropagation?.();
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    fn();
  };

  if (quantity === 0) {
    return (
      <Pressable
        testID={`quick-add-${product.slug}`}
        accessibilityRole="button"
        accessibilityLabel={`Add ${product.name} to basket`}
        onPress={tap(increment)}
        hitSlop={12}
        style={({ pressed }) => [
          styles.add,
          {
            backgroundColor: colors.card,
            borderColor: colors.primary,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={18} color={colors.primary} />
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.stepper, { backgroundColor: colors.primary, borderColor: colors.primary }]}
      accessibilityRole="adjustable"
      accessibilityLabel={`${product.name}, ${quantity} in basket`}
    >
      <Pressable
        testID={`quick-dec-${product.slug}`}
        accessibilityRole="button"
        accessibilityLabel="Remove one"
        onPress={tap(decrement)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 2 }}
        style={({ pressed }) => [styles.step, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Feather name="minus" size={15} color={colors.primaryForeground} />
      </Pressable>
      <Text style={[styles.qty, { color: colors.primaryForeground }]}>{quantity}</Text>
      <Pressable
        testID={`quick-inc-${product.slug}`}
        accessibilityRole="button"
        accessibilityLabel="Add one more"
        onPress={tap(increment)}
        hitSlop={{ top: 8, bottom: 8, left: 2, right: 8 }}
        style={({ pressed }) => [styles.step, { opacity: atMax ? 0.4 : pressed ? 0.6 : 1 }]}
      >
        <Feather name="plus" size={15} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  add: {
    width: SIZE,
    height: SIZE,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: deepInk,
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  stepper: {
    height: SIZE,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: deepInk,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  step: { width: 28, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  qty: {
    minWidth: 20,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    lineHeight: 18,
    includeFontPadding: false,
  },
});
