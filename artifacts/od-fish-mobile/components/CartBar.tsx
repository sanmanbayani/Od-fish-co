import React from 'react';
import { Platform, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetCart } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { deepInk, radii } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { rupees } from '@/lib/format';
import { fonts } from '@/constants/typography';

/**
 * Floating "View Cart" bar. Rendered above the tab bar on shopping screens and
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

  const itemText = cart.itemCount === 1 ? '1 item' : `${cart.itemCount} items`;

  return (
    <View
      style={[
        styles.wrap,
        { bottom: offset + Math.max(insets.bottom, 10) + 12 },
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
          <RNText style={styles.itemCountText}>
            {itemText}
          </RNText>
          <View style={styles.divider} />
          <RNText style={styles.priceText}>
            {rupees(cart.bill.subtotalPaise)}
          </RNText>
        </View>

        <View style={styles.right}>
          <RNText style={styles.actionText}>
            View Cart
          </RNText>
          <View style={styles.chevronWrap}>
            <Feather name="chevron-right" size={18} color="#FFFFFF" />
          </View>
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
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: deepInk,
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCountText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14.5,
    lineHeight: 19,
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  divider: {
    width: 1,
    height: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    marginHorizontal: 10,
    borderRadius: 0.5,
    transform: [{ translateY: Platform.OS === 'android' ? -1 : 0 }],
  },
  priceText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15.5,
    lineHeight: 19,
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  chevronWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    transform: [{ translateY: Platform.OS === 'android' ? -0.5 : 0 }],
  },
});


