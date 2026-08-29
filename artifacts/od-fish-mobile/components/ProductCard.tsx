import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { Product } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii } from '@/constants/colors';
import { mediaUrl } from '@/lib/api';
import { discountPercent, rupees } from '@/lib/format';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';

/** Wide card used in horizontal rails on the home feed. */
export function ProductCard({
  product,
  width = 168,
}: {
  product: Product;
  width?: number;
}) {
  const colors = useColors();
  const cheapest = product.variants
    .filter((v) => v.isActive)
    .sort((a, b) => a.pricePaise - b.pricePaise)[0];
  const off = cheapest ? discountPercent(cheapest.mrpPaise, cheapest.pricePaise) : null;

  return (
    <Pressable
      onPress={() => router.push(`/product/${product.slug}`)}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radii.xl,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.accent }]}>
        <Image
          source={mediaUrl(product.imageUrls?.[0])}
          style={styles.image}
          contentFit="cover"
          transition={180}
        />
        {off ? (
          <Badge label={`${off}% off`} tone="danger" style={styles.offBadge} />
        ) : null}
        {!product.inStock ? (
          <View style={styles.soldOutVeil}>
            <Badge label="Sold out" tone="navy" />
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text variant="cardTitle" numberOfLines={1}>
          {product.name}
        </Text>
        {product.nameLocal ? (
          <Text variant="small" tone="muted" numberOfLines={1} style={styles.local}>
            {product.nameLocal}
          </Text>
        ) : null}
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
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  imageWrap: { aspectRatio: 1.12, width: '100%' },
  image: { width: '100%', height: '100%' },
  offBadge: { position: 'absolute', top: 8, left: 8 },
  soldOutVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,246,241,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 10, gap: 2 },
  local: { marginBottom: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  strike: { textDecorationLine: 'line-through' },
});
