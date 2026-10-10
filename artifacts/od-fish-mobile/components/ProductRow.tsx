import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { Product } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { overlay, radii } from '@/constants/colors';
import { mediaUrl } from '@/lib/api';
import { STUDIO_PREVIEWS } from '@/constants/studioPreviews';
import { cutLabel, rupees } from '@/lib/format';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { QuickAddButton } from '@/components/QuickAddButton';

/** Full-width row used in the catalogue list. */
export function ProductRow({ product }: { product: Product }) {
  const colors = useColors();
  const active = product.variants.filter((v) => v.isActive);
  const cheapest = [...active].sort((a, b) => a.pricePaise - b.pricePaise)[0];
  const multiPack = active.length > 1;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radii.xl,
        },
      ]}
    >
      <Pressable
        onPress={() => router.push(`/product/${product.slug}`)}
        style={({ pressed }) => [styles.mainArea, { opacity: pressed ? 0.9 : 1 }]}
      >
        <View style={[styles.thumbWrap, { backgroundColor: colors.accent }]}>
          <Image
            source={STUDIO_PREVIEWS[product.slug] ?? mediaUrl(product.imageUrls?.[0])}
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
          </View>
          {cheapest ? (
            <Text variant="tiny" tone="muted" numberOfLines={1} style={styles.meta}>
              {multiPack
                ? `${cutLabel(cheapest.cutType)} · ${active.length} pack sizes`
                : `${cutLabel(cheapest.cutType)} · ${cheapest.packLabel}`}
            </Text>
          ) : null}
          <View style={styles.priceRow}>
            {multiPack ? (
              <Text variant="tiny" tone="muted">
                From
              </Text>
            ) : null}
            <Text variant="price">{rupees(product.fromPricePaise ?? cheapest?.pricePaise)}</Text>
            {cheapest && cheapest.mrpPaise > cheapest.pricePaise ? (
              <Text variant="small" tone="muted" style={styles.strike}>
                {rupees(cheapest.mrpPaise)}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      <View style={styles.actionWrap}>
        {product.inStock ? (
          <QuickAddButton product={product} />
        ) : (
          <Badge label="Sold out" tone="neutral" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionWrap: {
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  strike: { textDecorationLine: 'line-through' },
});
