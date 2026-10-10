import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetCart } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { deepInk, overlay, radii } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { rupees } from '@/lib/format';
import { fonts } from '@/constants/typography';
import { CART_QUERY_KEY, useCartMessage } from '@/lib/quickCart';

const EASE = Easing.out(Easing.cubic);

/**
 * Floating checkout bar above the tab bar on shopping screens. It follows the
 * cart cache, which card taps update instantly, so the count and total change
 * with every + / −. It slides in with the first item and away when the cart
 * empties. Short basket messages (sold out, max reached) appear just above it.
 */
export function CartBar({ offset = 0 }: { offset?: number }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { data: cart } = useGetCart({
    query: { queryKey: CART_QUERY_KEY, enabled: isSignedIn },
  });
  const message = useCartMessage();

  const count = isSignedIn ? (cart?.itemCount ?? 0) : 0;
  const visible = count > 0;

  // Keep the last non-empty numbers on screen while the bar slides away.
  const shown = useRef({ count: 0, subtotal: 0 });
  if (visible && cart) shown.current = { count, subtotal: cart.bill.subtotalPaise };

  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: 260, easing: EASE });
    } else {
      progress.value = withTiming(0, { duration: 200, easing: EASE }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress]);

  const barStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 90 }],
  }));

  const bottom = offset + Math.max(insets.bottom, 10) + 12;
  const { count: n, subtotal } = shown.current;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      {message ? (
        <View
          key={message.id}
          style={[styles.toast, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityLiveRegion="polite"
          pointerEvents="none"
        >
          <Feather name="info" size={14} color={colors.primary} />
          <RNText style={[styles.toastText, { color: colors.foreground }]} numberOfLines={2}>
            {message.text}
          </RNText>
        </View>
      ) : null}

      {mounted ? (
        <Animated.View style={barStyle} pointerEvents={visible ? 'auto' : 'none'}>
          <Pressable
            testID="cart-bar"
            accessibilityRole="button"
            accessibilityLabel={`${n} ${n === 1 ? 'item' : 'items'}, ${rupees(subtotal)} plus fees. View cart`}
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
              <View style={styles.countDot}>
                <RNText style={styles.countText}>{n}</RNText>
              </View>
              <View>
                <RNText style={styles.itemText}>{n === 1 ? '1 item' : `${n} items`}</RNText>
                <RNText style={styles.priceText}>{rupees(subtotal)} + fees</RNText>
              </View>
            </View>

            <View style={styles.right}>
              <RNText style={styles.actionText}>View cart</RNText>
              <Feather name="arrow-right" size={18} color={colors.deepForeground} />
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
    ...Platform.select({ web: { maxWidth: 640, alignSelf: 'center' } }),
  },
  toast: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
    shadowColor: deepInk,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toastText: {
    flexShrink: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 17,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingLeft: 12,
    paddingRight: 18,
    shadowColor: deepInk,
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  countDot: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 6,
    borderRadius: 17,
    backgroundColor: overlay.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    lineHeight: 19,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  itemText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    lineHeight: 19,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  priceText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    lineHeight: 16,
    color: overlay.mutedForeground,
    includeFontPadding: false,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});
