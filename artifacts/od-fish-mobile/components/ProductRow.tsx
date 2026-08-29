import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { Product } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { overlay, radii } from '@/constants/colors';
import { mediaUrl } from '@/lib/api';
import { cutLabel, discountPercent, netWeightRange, rupees } from '@/lib/format';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';

/** Full-width row used in the catalogue list. */
export function ProductRow({ product }: { product: Product }) {
  const colors = useColors();
  const active = product.variants.filter((v) => v.isActive);
  const cheapest = [...active].sort((a, b) => a.pricePaise - b.pricePaise)[0];
  const off = cheapest ? discountPercent(cheapest.mrpPaise, cheapest.pricePaise) : null;
  const weight = cheapest
    ? netWeightRange(cheapest.netWeightMinG, cheapest.netWeightMaxG)
    : null;

  return (
    <Pressable
      onPress={() => router.push(`/product/${product.slug}`)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radii.xl,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.thumbWrap, { backgroundColor: colors.accent }]}>
        <Image
          source={mediaUrl(product.imageUrls?.[0])}
          style={styles.thumb}
          contentFit="cover"
          transition={180}
        />
        {!product.inStock ? <View style={styles.veil} /> : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="cardTitle" numberOfLines={1} style={styles.flex}>
            {product.name}
          </Text>
          {off ? <Badge label={`${off}%`} tone="danger" /> : null}
        </View>
        {product.nameLocal ? (
          <Text variant="small" tone="muted" numberOfLines={1}>
            {product.nameLocal}
          </Text>
        ) : null}
        {cheapest ? (
          <Text variant="tiny" tone="muted" numberOfLines={1} style={styles.meta}>
            {cutLabel(cheapest.cutType)} · {cheapest.packLabel}
            {weight ? ` · ${weight}` : ''}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <View style={styles.priceRow}>
            <Text variant="price">
              {rupees(product.fromPricePaise ?? cheapest?.pricePaise)}
            </Text>
            {cheapest && cheapest.mrpPaise > cheapest.pricePaise ? (
              <Text variant="small" tone="muted" style={styles.strike}>
                {rupees(cheapest.mrpPaise)}
              </Text>
            ) : null}
          </View>
          {product.inStock ? (
            <View style={[styles.cta, { borderColor: colors.primary }]}>
              <Text variant="smallMedium" tone="primary">
                {active.length > 1 ? `${active.length} packs` : 'View'}
              </Text>
            </View>
          ) : (
            <Badge label="Sold out" tone="neutral" />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  thumbWrap: { width: 104, aspectRatio: 0.92 },
  thumb: { width: '100%', height: '100%' },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: overlay.scrim,
  },
  body: { flex: 1, padding: 12, gap: 2, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  meta: { marginTop: 3 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  strike: { textDecorationLine: 'line-through' },
  cta: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
});
