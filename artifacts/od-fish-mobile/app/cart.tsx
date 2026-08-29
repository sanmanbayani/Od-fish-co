import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import type { CartItem } from '@workspace/api-client-react';
import {
  useGetCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';
import { mediaUrl } from '@/lib/api';
import { apiErrorMessage, cutLabel, netWeightRange, rupees } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui/Card';
import { QtyStepper } from '@/components/ui/QtyStepper';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { Screen } from '@/components/ui/Screen';

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn, isReady } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busyVariant, setBusyVariant] = useState<string | null>(null);

  const cart = useGetCart({ query: { queryKey: ['cart'], enabled: isSignedIn } });
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['cart'] });

  const changeQty = async (variantId: string, quantity: number) => {
    setError(null);
    setBusyVariant(variantId);
    try {
      if (quantity <= 0) {
        await removeItem.mutateAsync({ variantId });
      } else {
        await updateItem.mutateAsync({ variantId, data: { quantity } });
      }
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update your basket.'));
    } finally {
      setBusyVariant(null);
    }
  };

  if (!isReady || (isSignedIn && cart.isLoading)) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }

  if (!isSignedIn) {
    return (
      <Screen>
        <EmptyState
          icon="shopping-cart"
          title="Sign in to start a basket"
          body="Prices and stock are held on the server, so we need to know who you are."
          actionLabel="Sign in"
          onAction={() => router.push('/login')}
        />
      </Screen>
    );
  }

  if (cart.isError || !cart.data) {
    return (
      <Screen>
        <ErrorView message="Could not load your basket." onRetry={() => cart.refetch()} />
      </Screen>
    );
  }

  if (cart.data.itemCount === 0) {
    return (
      <Screen>
        <EmptyState
          icon="shopping-cart"
          title="Your basket is empty"
          body="Today's catch is waiting on the counter."
          actionLabel="Browse the counter"
          onAction={() => router.replace('/(tabs)/shop')}
        />
      </Screen>
    );
  }

  const { items, bill, notices, codAvailable } = cart.data;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {notices.length > 0 ? (
          <Card tone="accent" style={styles.notice}>
            {notices.map((note) => (
              <View key={note} style={styles.noticeRow}>
                <Feather name="alert-circle" size={14} color={colors.mutedForeground} />
                <Text variant="small" tone="muted" style={styles.flex}>
                  {note}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {error ? (
          <Text variant="small" tone="danger" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Card padded={false}>
          {items.map((item, index) => (
            <View key={item.variantId}>
              {index > 0 ? <Divider /> : null}
              <CartRow
                item={item}
                busy={busyVariant === item.variantId}
                onChange={(qty) => changeQty(item.variantId, qty)}
              />
            </View>
          ))}
        </Card>

        {bill.amountToFreeDeliveryPaise > 0 ? (
          <Card tone="accent" style={styles.freeDelivery}>
            <Feather name="truck" size={15} color={colors.primary} />
            <Text variant="small" style={styles.flex}>
              Add {rupees(bill.amountToFreeDeliveryPaise)} more and delivery is on us.
            </Text>
          </Card>
        ) : (
          <Card tone="accent" style={styles.freeDelivery}>
            <Feather name="check-circle" size={15} color={colors.success} />
            <Text variant="small" tone="success" style={styles.flex}>
              Free delivery unlocked.
            </Text>
          </Card>
        )}

        <Card style={styles.bill}>
          <Text variant="label" tone="muted" uppercase>
            Bill details
          </Text>
          <View style={styles.billRows}>
            <BillRow label="Item total" value={rupees(bill.subtotalPaise)} />
            {bill.discountPaise > 0 ? (
              <BillRow
                label="Discount"
                value={`− ${rupees(bill.discountPaise)}`}
                tone="success"
              />
            ) : null}
            <BillRow
              label="Delivery fee"
              value={
                bill.deliveryFeePaise === 0 ? 'Free' : rupees(bill.deliveryFeePaise)
              }
              tone={bill.deliveryFeePaise === 0 ? 'success' : undefined}
            />
            <BillRow label="Handling & ice" value={rupees(bill.handlingFeePaise)} />
          </View>
          <Divider style={styles.billDivider} />
          <View style={styles.totalRow}>
            <Text variant="cardTitle">To pay</Text>
            <Text variant="price" style={styles.total}>
              {rupees(bill.totalPaise)}
            </Text>
          </View>
          {bill.savingsPaise > 0 ? (
            <Text variant="small" tone="success" style={styles.savings}>
              You saved {rupees(bill.savingsPaise)} on today's catch.
            </Text>
          ) : null}
        </Card>

        {!codAvailable ? (
          <Text variant="small" tone="muted" style={styles.codNote}>
            Cash on delivery is not available for this basket — pay online at
            checkout.
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <View style={styles.flex}>
          <Text variant="tiny" tone="muted">
            {items.length === 1 ? '1 item' : `${items.length} items`}
          </Text>
          <Text variant="price" style={styles.total}>
            {rupees(bill.totalPaise)}
          </Text>
        </View>
        <Button
          label="Choose slot & pay"
          size="lg"
          onPress={() => router.push('/checkout')}
          trailing={
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          }
        />
      </View>
    </Screen>
  );
}

function CartRow({
  item,
  busy,
  onChange,
}: {
  item: CartItem;
  busy: boolean;
  onChange: (quantity: number) => void;
}) {
  const colors = useColors();
  const weight = netWeightRange(item.netWeightMinG, item.netWeightMaxG);
  const low = item.stockQty <= 3;

  return (
    <View style={styles.row}>
      <View style={[styles.thumbWrap, { backgroundColor: colors.accent }]}>
        <Image
          source={mediaUrl(item.imageUrl)}
          style={styles.thumb}
          contentFit="cover"
        />
      </View>
      <View style={styles.rowBody}>
        <Text variant="cardTitle" numberOfLines={1}>
          {item.productName}
        </Text>
        <Text variant="tiny" tone="muted" numberOfLines={1} style={styles.rowMeta}>
          {cutLabel(item.cutType)} · {item.packLabel}
          {weight ? ` · ${weight}` : ''}
        </Text>
        {low ? <Badge label={`Only ${item.stockQty} left`} tone="warning" style={styles.lowBadge} /> : null}
        <View style={styles.rowFoot}>
          <QtyStepper
            quantity={item.quantity}
            onChange={onChange}
            max={Math.min(20, Math.max(item.stockQty, 1))}
            busy={busy}
            compact
          />
          <Text variant="bodySemi">{rupees(item.lineTotalPaise)}</Text>
        </View>
      </View>
    </View>
  );
}

function BillRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success';
}) {
  return (
    <View style={styles.billRow}>
      <Text variant="small" tone="muted" style={styles.flex}>
        {label}
      </Text>
      <Text variant="smallMedium" tone={tone === 'success' ? 'success' : 'default'}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 140, gap: spacing.md },
  notice: { gap: 6 },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  error: { marginTop: -4 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12, padding: spacing.md },
  thumbWrap: {
    width: 62,
    height: 62,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  rowBody: { flex: 1 },
  rowMeta: { marginTop: 3 },
  lowBadge: { marginTop: 6 },
  rowFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  freeDelivery: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  bill: {},
  billRows: { marginTop: 12, gap: 8 },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  billDivider: { marginVertical: 12 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  total: { fontSize: 18 },
  savings: { marginTop: 8 },
  codNote: { paddingHorizontal: 4 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
