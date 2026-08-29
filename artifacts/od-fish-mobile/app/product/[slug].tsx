import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import type { ProductVariant } from '@workspace/api-client-react';
import { useAddCartItem, useGetProduct } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';
import { mediaUrl } from '@/lib/api';
import {
  apiErrorMessage,
  cutLabel,
  discountPercent,
  grams,
  netWeightRange,
  rupees,
} from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { Screen } from '@/components/ui/Screen';

export default function ProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { requireAuth, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const product = useGetProduct(slug, {
    query: { queryKey: ['product', slug], enabled: Boolean(slug) },
  });
  const addToCart = useAddCartItem();

  const [variantId, setVariantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const variants = useMemo(
    () => (product.data?.variants ?? []).filter((v) => v.isActive),
    [product.data],
  );

  useEffect(() => {
    if (!variantId && variants.length > 0) {
      const inStock = variants.find((v) => v.stockQty > 0);
      setVariantId((inStock ?? variants[0]).id);
    }
  }, [variants, variantId]);

  if (product.isLoading) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }

  if (product.isError || !product.data) {
    return (
      <Screen>
        <ErrorView
          message="We could not find that fish."
          onRetry={() => product.refetch()}
        />
      </Screen>
    );
  }

  const item = product.data;
  const selected = variants.find((v) => v.id === variantId) ?? null;
  const off = selected ? discountPercent(selected.mrpPaise, selected.pricePaise) : null;
  const soldOut = !selected || selected.stockQty <= 0;

  const onAdd = async () => {
    setError(null);
    if (!selected) return;
    if (!requireAuth()) return;
    try {
      await addToCart.mutateAsync({ data: { variantId: selected.id, quantity: 1 } });
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      setAdded(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add that to your basket.'));
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: item.name }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.accent, height: width * 0.82 }]}>
          <Image
            source={mediaUrl(item.imageUrls?.[0])}
            style={styles.heroImage}
            contentFit="cover"
            transition={200}
          />
          {off ? (
            <Badge label={`${off}% off`} tone="danger" style={styles.heroBadge} />
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.flex}>
              <Text variant="title">{item.name}</Text>
              {item.nameLocal ? (
                <Text variant="body" tone="muted" style={styles.local}>
                  {item.nameLocal}
                </Text>
              ) : null}
            </View>
            <Badge
              label={item.inStock ? 'Fresh today' : 'Sold out'}
              tone={item.inStock ? 'success' : 'neutral'}
            />
          </View>

          {item.shortDesc ? (
            <Text variant="body" tone="muted" style={styles.desc}>
              {item.shortDesc}
            </Text>
          ) : null}

          {item.origin ? (
            <View style={styles.originRow}>
              <Feather name="anchor" size={13} color={colors.mutedForeground} />
              <Text variant="small" tone="muted">
                {item.origin}
              </Text>
            </View>
          ) : null}

          {/* Pack picker — every option discloses gross vs net so there are no
              surprises at the door. */}
          <Text variant="section" style={styles.sectionTitle}>
            Choose your pack
          </Text>
          <View style={styles.variants}>
            {variants.map((variant) => (
              <VariantOption
                key={variant.id}
                variant={variant}
                selected={variant.id === variantId}
                onSelect={() => {
                  setVariantId(variant.id);
                  setAdded(false);
                  setError(null);
                }}
              />
            ))}
          </View>

          {selected ? (
            <Card tone="accent" style={styles.weightCard}>
              <Text variant="label" tone="muted" uppercase>
                What you actually get
              </Text>
              <View style={styles.weightRows}>
                {selected.grossWeightG ? (
                  <WeightRow
                    label="Gross weight (before cleaning)"
                    value={grams(selected.grossWeightG)}
                  />
                ) : null}
                {netWeightRange(selected.netWeightMinG, selected.netWeightMaxG) ? (
                  <WeightRow
                    label="Net edible weight"
                    value={netWeightRange(
                      selected.netWeightMinG,
                      selected.netWeightMaxG,
                    )!}
                  />
                ) : null}
                {selected.pieceCount ? (
                  <WeightRow
                    label="Pieces in the pack"
                    value={`${selected.pieceCount}`}
                  />
                ) : null}
                {selected.perKgPaise ? (
                  <WeightRow
                    label="Effective rate"
                    value={`${rupees(selected.perKgPaise)}/kg`}
                  />
                ) : null}
              </View>
              <Text variant="tiny" tone="muted" style={styles.weightNote}>
                Sea fish never weighs the same twice. We price the pack, not the
                gram, and disclose the range up front.
              </Text>
            </Card>
          ) : null}

          {item.bestFor && item.bestFor.length > 0 ? (
            <>
              <Text variant="section" style={styles.sectionTitle}>
                Best for
              </Text>
              <View style={styles.tags}>
                {item.bestFor.map((tag) => (
                  <Badge key={tag} label={tag} tone="neutral" />
                ))}
              </View>
            </>
          ) : null}

          {item.longDesc ? (
            <>
              <Text variant="section" style={styles.sectionTitle}>
                About this fish
              </Text>
              <Text variant="body" tone="muted" style={styles.long}>
                {item.longDesc}
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky buy bar */}
      <View
        style={[
          styles.buyBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        {error ? (
          <Text variant="small" tone="danger" style={styles.buyError}>
            {error}
          </Text>
        ) : null}
        <View style={styles.buyRow}>
          <View style={styles.flex}>
            <View style={styles.priceRow}>
              <Text variant="price" style={styles.bigPrice}>
                {rupees(selected?.pricePaise)}
              </Text>
              {selected && selected.mrpPaise > selected.pricePaise ? (
                <Text variant="small" tone="muted" style={styles.strike}>
                  {rupees(selected.mrpPaise)}
                </Text>
              ) : null}
            </View>
            <Text variant="tiny" tone="muted" numberOfLines={1}>
              {selected ? selected.packLabel : 'Select a pack'}
            </Text>
          </View>
          {added && isSignedIn ? (
            <Button
              label="Go to basket"
              onPress={() => router.push('/cart')}
              size="lg"
              icon={<Feather name="check" size={16} color={colors.primaryForeground} />}
            />
          ) : (
            <Button
              label={soldOut ? 'Sold out' : 'Add to basket'}
              onPress={onAdd}
              disabled={soldOut}
              loading={addToCart.isPending}
              size="lg"
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

function VariantOption({
  variant,
  selected,
  onSelect,
}: {
  variant: ProductVariant;
  selected: boolean;
  onSelect: () => void;
}) {
  const colors = useColors();
  const soldOut = variant.stockQty <= 0;
  const low = !soldOut && variant.stockQty <= variant.lowStockAt;
  const weight = netWeightRange(variant.netWeightMinG, variant.netWeightMaxG);

  return (
    <Pressable
      onPress={onSelect}
      disabled={soldOut}
      style={({ pressed }) => [
        styles.variant,
        {
          backgroundColor: selected ? colors.accent : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderRadius: radii.lg,
          opacity: soldOut ? 0.5 : pressed ? 0.9 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.primary : 'transparent',
          },
        ]}
      >
        {selected ? (
          <Feather name="check" size={11} color={colors.primaryForeground} />
        ) : null}
      </View>
      <View style={styles.flex}>
        <Text variant="bodyMedium">{cutLabel(variant.cutType)}</Text>
        <Text variant="tiny" tone="muted" style={styles.variantMeta}>
          {variant.packLabel}
          {weight ? ` · ${weight}` : ''}
        </Text>
      </View>
      <View style={styles.variantRight}>
        <Text variant="bodySemi">{rupees(variant.pricePaise)}</Text>
        {soldOut ? (
          <Badge label="Sold out" tone="neutral" />
        ) : low ? (
          <Badge label={`${variant.stockQty} left`} tone="warning" />
        ) : null}
      </View>
    </Pressable>
  );
}

function WeightRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.weightRow}>
      <Text variant="small" tone="muted" style={styles.flex}>
        {label}
      </Text>
      <Text variant="smallMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%' },
  heroImage: { width: '100%', height: '100%' },
  heroBadge: { position: 'absolute', top: 14, left: 14 },
  body: { padding: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  flex: { flex: 1 },
  local: { marginTop: 2 },
  desc: { marginTop: spacing.md, lineHeight: 21 },
  originRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  variants: { gap: 8 },
  variant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantMeta: { marginTop: 2 },
  variantRight: { alignItems: 'flex-end', gap: 4 },
  weightCard: { marginTop: spacing.lg },
  weightRows: { marginTop: 10, gap: 7 },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weightNote: { marginTop: 12, lineHeight: 16 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  long: { lineHeight: 22 },
  buyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  buyError: { marginBottom: 8 },
  buyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigPrice: { fontSize: 20 },
  strike: { textDecorationLine: 'line-through' },
});
