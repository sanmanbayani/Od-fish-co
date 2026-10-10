import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { Product } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { overlay, radii } from '@/constants/colors';
import { mediaUrl } from '@/lib/api';
import { STUDIO_PREVIEWS } from '@/constants/studioPreviews';
import { rupees } from '@/lib/format';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { QuickAddButton } from '@/components/QuickAddButton';

/** Wide card used in horizontal rails on the home feed. */
export function ProductCard({ product, width = 168 }: { product: Product; width?: number }) {
  const colors = useColors();
  const cheapest = product.variants
    .filter((v) => v.isActive)
    .sort((a, b) => a.pricePaise - b.pricePaise)[0];

  const goToProduct = () => {
    router.push(`/product/${product.slug}`);
  };

  return (
    <View
      style={[
        styles.card,
        {
          width,
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radii.xl,
        },
      ]}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.accent }]}>
        <Pressable
          onPress={goToProduct}
          style={({ pressed }) => [StyleSheet.absoluteFillObject, { opacity: pressed ? 0.9 : 1 }]}
        >
          <Image
            source={STUDIO_PREVIEWS[product.slug] ?? mediaUrl(product.imageUrls?.[0])}
            style={styles.image}
            contentFit="cover"
            transition={180}
          />
          {!product.inStock ? (
            <View style={styles.soldOutVeil}>
              <Badge label="Sold out" tone="navy" />
            </View>
          ) : null}
        </Pressable>
        <View style={styles.quickAdd}>
          <QuickAddButton product={product} />
        </View>
      </View>
      <Pressable
        onPress={goToProduct}
        style={({ pressed }) => [styles.body, { opacity: pressed ? 0.9 : 1 }]}
      >
        <Text variant="cardTitle" numberOfLines={1}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text variant="price">{rupees(product.fromPricePaise ?? cheapest?.pricePaise)}</Text>
          {cheapest && cheapest.mrpPaise > cheapest.pricePaise ? (
            <Text variant="small" tone="muted" style={styles.strike}>
              {rupees(cheapest.mrpPaise)}
            </Text>
          ) : null}
        </View>
        {cheapest ? (
          <Text variant="tiny" tone="muted" numberOfLines={1}>
            {cheapest.packLabel}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  imageWrap: { aspectRatio: 1.12, width: '100%' },
  image: { width: '100%', height: '100%' },
  soldOutVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: overlay.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAdd: { position: 'absolute', right: 8, bottom: 8 },
  body: { padding: 10, gap: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  strike: { textDecorationLine: 'line-through' },
});
