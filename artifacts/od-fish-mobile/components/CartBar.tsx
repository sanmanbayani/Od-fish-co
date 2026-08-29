import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetCart } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { deepInk, overlay, radii } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { rupees } from '@/lib/format';
import { Text } from '@/components/ui/Text';

/**
 * Floating "view cart" bar. Rendered above the tab bar on shopping screens and
 * hidden entirely when the cart is empty or the customer is signed out.
 */
export function CartBar({ offset = 0 }: { offset?: number }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { data: cart } = useGetCart({
    query: { queryKey: ['cart'], enabled: isSignedIn },
  });

  if (!isSignedIn || !cart || cart.itemCount === 0) return null;

  return (
    <View
      style={[
        styles.wrap,
        { bottom: offset + Math.max(insets.bottom, 10) },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/cart')}
        style={({ pressed }) => [
          styles.bar,
          {
            backgroundColor: colors.deep,
            borderRadius: radii.xl,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={styles.left}>
          <View style={[styles.count, { backgroundColor: overlay.fill }]}>
            <Text variant="smallMedium" tone="inverse">
              {cart.itemCount}
            </Text>
          </View>
          <View>
            <Text variant="smallMedium" tone="inverse">
              {cart.itemCount === 1 ? '1 item' : `${cart.itemCount} items`}
            </Text>
            <Text variant="tiny" style={{ color: overlay.mutedForeground }}>
              {rupees(cart.bill.subtotalPaise)} + fees
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text variant="bodySemi" tone="inverse">
            View cart
          </Text>
          <Feather name="arrow-right" size={16} color={colors.deepForeground} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    ...Platform.select({ web: { maxWidth: 640, alignSelf: 'center' } }),
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: deepInk,
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  count: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
