import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCancelOrder,
  useGetOrder,
  useReorder,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { overlay, radii, spacing } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { mediaUrl } from '@/lib/api';
import {
  apiErrorMessage,
  cutLabel,
  deliveryDate,
  rupees,
  statusLabel,
  timestamp,
  TRACKING_STEPS,
  slotWindow,
} from '@/lib/format';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui/Card';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { Screen } from '@/components/ui/Screen';
import { statusTone } from '@/app/(tabs)/orders';

export default function OrderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const order = useGetOrder(id, {
    query: {
      queryKey: ['order', id],
      enabled: Boolean(id),
      // A live order changes underneath the customer while a rider is moving.
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status && TRACKING_STEPS.includes(status as never) ? 20_000 : false;
      },
    },
  });
  const cancelOrder = useCancelOrder();
  const reorder = useReorder();

  if (order.isLoading) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }

  if (order.isError || !order.data) {
    return (
      <Screen>
        <ErrorView message="Could not load this order." onRetry={() => order.refetch()} />
      </Screen>
    );
  }

  const data = order.data;
  const cancelled = data.status === 'CANCELLED' || data.status === 'FAILED';
  const currentStep = TRACKING_STEPS.indexOf(data.status as never);

  const onCancel = () => {
    const run = async () => {
      setError(null);
      try {
        await cancelOrder.mutateAsync({
          id: data.id,
          data: { reason: 'Cancelled by customer' },
        });
        await queryClient.invalidateQueries({ queryKey: ['order', id] });
        await queryClient.invalidateQueries({ queryKey: ['orders'] });
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not cancel this order.'));
      }
    };
    // Alert.alert is a no-op on react-native-web, so the browser build needs
    // its own confirm — without one, a stray tap cancels a real order.
    if (Platform.OS === 'web') {
      const ok =
        typeof window === 'undefined' ||
        window.confirm(
          'Cancel this order?\n\nFish is cut to order, so cancellation is only possible before we pack.',
        );
      if (ok) run();
      return;
    }
    Alert.alert(
      'Cancel this order?',
      'Fish is cut to order, so cancellation is only possible before we pack.',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Cancel order', style: 'destructive', onPress: run },
      ],
    );
  };

  const onReorder = async () => {
    setError(null);
    try {
      await reorder.mutateAsync({ id: data.id });
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      router.push('/cart');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not rebuild that basket.'));
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: data.orderNumber }} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {placed === '1' ? (
          <Card tone="accent" style={styles.placedCard}>
            <Feather name="check-circle" size={18} color={colors.success} />
            <View style={styles.flex}>
              <Text variant="cardTitle">Order confirmed</Text>
              <Text variant="small" tone="muted" style={styles.gap}>
                We are cutting your fish fresh. You will get an SMS when the
                rider leaves.
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Delivery OTP — the single most important thing on this screen once
            the rider is moving. */}
        {data.deliveryOtp ? (
          <Card tone="deep" style={styles.otpCard}>
            <Text variant="label" uppercase style={{ color: overlay.mutedForeground }}>
              Read this to your rider
            </Text>
            <Text style={[styles.otpValue, { color: colors.deepForeground }]}>
              {data.deliveryOtp.split('').join(' ')}
            </Text>
            <Text variant="small" style={{ color: overlay.mutedForeground }}>
              {data.riderName
                ? `${data.riderName} is on the way${data.riderPhone ? ` · +91 ${data.riderPhone}` : ''}`
                : 'Your rider is on the way.'}
            </Text>
          </Card>
        ) : null}

        {/* Status */}
        <Card>
          <View style={styles.statusHead}>
            <View style={styles.flex}>
              <Text variant="section">{statusLabel(data.status)}</Text>
              <Text variant="small" tone="muted" style={styles.gap}>
                {deliveryDate(data.deliveryDate)} · {slotWindow(data.slotLabel)}
              </Text>
            </View>
            <Badge label={statusLabel(data.status)} tone={statusTone(data.status)} />
          </View>

          {cancelled ? (
            <View style={styles.cancelBox}>
              <Feather name="x-circle" size={15} color={colors.destructive} />
              <Text variant="small" tone="danger" style={styles.flex}>
                {data.cancellationReason ?? 'This order was cancelled.'}
                {data.paymentStatus === 'REFUNDED'
                  ? ' Your refund is on its way.'
                  : ''}
              </Text>
            </View>
          ) : (
            <View style={styles.steps}>
              {TRACKING_STEPS.map((step, index) => {
                const done = currentStep >= index;
                const active = currentStep === index;
                return (
                  <View key={step} style={styles.step}>
                    <View style={styles.stepRail}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: done ? colors.primary : colors.border,
                            borderColor: active ? colors.primary : 'transparent',
                            borderWidth: active ? 3 : 0,
                          },
                        ]}
                      />
                      {index < TRACKING_STEPS.length - 1 ? (
                        <View
                          style={[
                            styles.line,
                            {
                              backgroundColor:
                                currentStep > index ? colors.primary : colors.border,
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                    <Text
                      variant={active ? 'bodyMedium' : 'body'}
                      tone={done ? 'default' : 'muted'}
                      style={styles.stepLabel}
                    >
                      {statusLabel(step)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Items */}
        <Card padded={false}>
          <View style={styles.itemsHead}>
            <Text variant="label" tone="muted" uppercase>
              {data.items.length === 1 ? '1 item' : `${data.items.length} items`}
            </Text>
          </View>
          {data.items.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.itemRow}>
                <View style={[styles.thumbWrap, { backgroundColor: colors.accent }]}>
                  <Image
                    source={mediaUrl(item.imageUrl)}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                </View>
                <View style={styles.flex}>
                  <Text variant="cardTitle" numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text variant="tiny" tone="muted" style={styles.gap}>
                    {cutLabel(item.cutType)} · {item.packLabel} · ×{item.quantity}
                  </Text>
                </View>
                <Text variant="bodySemi">{rupees(item.lineTotalPaise)}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Bill */}
        <Card>
          <Text variant="label" tone="muted" uppercase>
            Bill
          </Text>
          <View style={styles.billRows}>
            <BillRow label="Item total" value={rupees(data.subtotalPaise)} />
            {data.discountPaise ? (
              <BillRow label="Discount" value={`− ${rupees(data.discountPaise)}`} />
            ) : null}
            <BillRow
              label="Delivery"
              value={data.deliveryFeePaise === 0 ? 'Free' : rupees(data.deliveryFeePaise)}
            />
            <BillRow label="Handling & ice" value={rupees(data.handlingFeePaise)} />
          </View>
          <Divider style={styles.divider} />
          <View style={styles.totalRow}>
            <Text variant="cardTitle">
              {data.paymentMethod === 'COD' ? 'Pay on delivery' : 'Paid'}
            </Text>
            <Text variant="price" style={styles.total}>
              {rupees(data.totalPaise)}
            </Text>
          </View>
          <Text variant="tiny" tone="muted" style={styles.payMeta}>
            {data.paymentMethod} · {data.paymentStatus.toLowerCase()}
          </Text>
        </Card>

        {/* Address */}
        <Card>
          <Text variant="label" tone="muted" uppercase>
            Delivering to
          </Text>
          <Text variant="bodyMedium" style={styles.addrTop}>
            {data.address.receiverName}
          </Text>
          <Text variant="small" tone="muted" style={styles.gap}>
            {data.address.line1}
            {data.address.line2 ? `, ${data.address.line2}` : ''}, {data.address.area},{' '}
            {data.address.city} {data.address.pincode}
          </Text>
          {data.customerNote ? (
            <Text variant="small" tone="muted" style={styles.note}>
              Note: {data.customerNote}
            </Text>
          ) : null}
        </Card>

        {/* Timeline */}
        {data.events.length > 0 ? (
          <Card>
            <Text variant="label" tone="muted" uppercase>
              Timeline
            </Text>
            <View style={styles.timeline}>
              {data.events.map((event) => (
                <View key={event.id} style={styles.event}>
                  <View style={[styles.eventDot, { backgroundColor: colors.border }]} />
                  <View style={styles.flex}>
                    <Text variant="smallMedium">{statusLabel(event.toStatus)}</Text>
                    <Text variant="tiny" tone="muted" style={styles.gap}>
                      {timestamp(event.createdAt)}
                      {event.note ? ` · ${event.note}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {error ? (
          <Text variant="small" tone="danger">
            {error}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button
            label="Order these again"
            variant="outline"
            fullWidth
            loading={reorder.isPending}
            onPress={onReorder}
          />
          {data.canCancel ? (
            <Button
              label="Cancel order"
              variant="ghost"
              fullWidth
              loading={cancelOrder.isPending}
              onPress={onCancel}
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function BillRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.billRow}>
      <Text variant="small" tone="muted" style={styles.flex}>
        {label}
      </Text>
      <Text variant="smallMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  flex: { flex: 1 },
  gap: { marginTop: 3 },
  placedCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  otpCard: { alignItems: 'center', paddingVertical: spacing.xl },
  otpValue: {
    fontFamily: fonts.monoBold,
    fontSize: 40,
    letterSpacing: 4,
    marginVertical: 10,
  },
  statusHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cancelBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  steps: { marginTop: spacing.lg },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepRail: { alignItems: 'center', width: 16 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  line: { width: 2, flex: 1, minHeight: 22 },
  stepLabel: { paddingBottom: 14, flex: 1 },
  itemsHead: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 4 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  thumbWrap: { width: 46, height: 46, borderRadius: radii.md, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  billRows: { marginTop: 12, gap: 8 },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { marginVertical: 12 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  total: { fontSize: 18 },
  payMeta: { marginTop: 6, textTransform: 'capitalize' },
  addrTop: { marginTop: 10 },
  note: { marginTop: 8, fontStyle: 'italic' },
  timeline: { marginTop: 12, gap: 12 },
  event: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  eventDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5 },
  actions: { gap: 8, marginTop: spacing.sm },
});
