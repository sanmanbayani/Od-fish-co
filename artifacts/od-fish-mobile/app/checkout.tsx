import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import type { Address, OrderInputPaymentMethod } from '@workspace/api-client-react';
import {
  useCreateOrder,
  useGetCart,
  useListAddresses,
  useListDeliverySlots,
  usePayOrder,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';
import { apiErrorMessage, rupees } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { SlotPicker, slotKey } from '@/components/SlotPicker';
import { getPreferredSlot, setPreferredSlot } from '@/lib/preferredSlot';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { KeyboardStickyFooter } from '@/components/KeyboardStickyFooter';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { Screen } from '@/components/ui/Screen';

type PaymentOption = {
  value: OrderInputPaymentMethod;
  label: string;
  caption: string;
  icon: React.ComponentProps<typeof Feather>['name'];
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  { value: 'UPI', label: 'UPI', caption: 'GPay, PhonePe, Paytm', icon: 'smartphone' },
  { value: 'CARD', label: 'Card', caption: 'Credit or debit', icon: 'credit-card' },
  {
    value: 'COD',
    label: 'Cash on delivery',
    caption: 'Pay the rider at your door',
    icon: 'dollar-sign',
  },
];

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const cart = useGetCart({ query: { queryKey: ['cart'], enabled: isSignedIn } });
  const addresses = useListAddresses({
    query: { queryKey: ['addresses'], enabled: isSignedIn },
  });
  const slots = useListDeliverySlots({ query: { queryKey: ['slots'] } });
  const createOrder = useCreateOrder();
  const payOrder = usePayOrder();

  const [addressId, setAddressId] = useState<string | null>(null);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [payment, setPayment] = useState<OrderInputPaymentMethod>('UPI');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const openSlots = useMemo(
    () => (slots.data ?? []).filter((s) => s.isOpen),
    [slots.data],
  );

  useEffect(() => {
    if (addressId || !addresses.data?.length) return;
    const serviceable = addresses.data.filter((a) => a.isServiceable);
    const preferred =
      serviceable.find((a) => a.isDefault) ?? serviceable[0] ?? addresses.data[0];
    setAddressId(preferred.id);
  }, [addresses.data, addressId]);

  useEffect(() => {
    if (!selectedSlotKey && openSlots.length > 0) {
      // Start from the slot picked on the home screen when it is still open;
      // otherwise fall back to the earliest open window.
      const preferred = getPreferredSlot();
      const match = preferred
        ? openSlots.find((s) => slotKey(s) === preferred.key)
        : undefined;
      setSelectedSlotKey(slotKey(match ?? openSlots[0]));
    }
  }, [openSlots, selectedSlotKey]);

  useEffect(() => {
    if (cart.data && !cart.data.codAvailable && payment === 'COD') setPayment('UPI');
  }, [cart.data, payment]);

  if (cart.isLoading || addresses.isLoading || slots.isLoading) {
    return (
      <Screen>
        <LoadingView />
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

  // Without this, a failed request renders as "no saved addresses" and "every
  // slot for today has closed" — a customer would believe the shop was shut.
  if (addresses.isError || slots.isError) {
    return (
      <Screen>
        <ErrorView
          message="Could not load your addresses and delivery slots."
          onRetry={() => {
            if (addresses.isError) addresses.refetch();
            if (slots.isError) slots.refetch();
          }}
        />
      </Screen>
    );
  }

  if (cart.data.itemCount === 0) {
    return (
      <Screen>
        <EmptyState
          icon="shopping-cart"
          title="Your basket is empty"
          actionLabel="Browse the counter"
          onAction={() => router.replace('/(tabs)/shop')}
        />
      </Screen>
    );
  }

  const addressList = addresses.data ?? [];
  const selectedAddress = addressList.find((a) => a.id === addressId) ?? null;
  const selectedSlot = openSlots.find((s) => slotKey(s) === selectedSlotKey) ?? null;
  const canPlace =
    Boolean(selectedAddress?.isServiceable) &&
    Boolean(selectedSlot) &&
    !createOrder.isPending;

  const placeOrder = async () => {
    setError(null);
    if (!addressId || !selectedSlot) return;
    try {
      const order = await createOrder.mutateAsync({
        data: {
          addressId,
          slotId: selectedSlot.id,
          deliveryDate: selectedSlot.deliveryDate,
          paymentMethod: payment,
          ...(note.trim() ? { customerNote: note.trim() } : {}),
        },
      });

      // Prepaid orders land in PENDING_PAYMENT. No gateway is wired yet, so the
      // server exposes a test-mode settlement route outside production. If that
      // route is unavailable the order still exists and is simply awaiting
      // payment — so we take the customer to it rather than losing it behind an
      // error.
      if (payment !== 'COD') {
        try {
          await payOrder.mutateAsync({
            id: order.id,
            data: { outcome: 'SUCCESS', reference: `TEST-${Date.now()}` },
          });
        } catch {
          // Fall through to the order screen, which shows the pending state.
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.replace(`/order/${order.id}?placed=1`);
    } catch (err) {
      setError(apiErrorMessage(err, 'We could not place your order. Try again.'));
    }
  };

  return (
    <Screen>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={96}
      >
        {/* Address */}
        <View>
          <View style={styles.sectionHead}>
            <Text variant="section">Deliver to</Text>
            <Pressable onPress={() => router.push('/address-form')} hitSlop={8}>
              <Text variant="smallMedium" tone="primary">
                + Add new
              </Text>
            </Pressable>
          </View>
          {addressList.length === 0 ? (
            <Card tone="accent">
              <Text variant="body" tone="muted">
                No saved addresses yet. Add one so we know where to bring the ice
                box.
              </Text>
              <Button
                label="Add an address"
                size="md"
                onPress={() => router.push('/address-form')}
                style={styles.addBtn}
              />
            </Card>
          ) : (
            <View style={styles.list}>
              {addressList.map((address) => (
                <AddressOption
                  key={address.id}
                  address={address}
                  selected={address.id === addressId}
                  onSelect={() => setAddressId(address.id)}
                />
              ))}
            </View>
          )}
          {selectedAddress && !selectedAddress.isServiceable ? (
            <View style={styles.warn}>
              <Feather name="alert-triangle" size={14} color={colors.destructive} />
              <Text variant="small" tone="danger" style={styles.flex}>
                We do not deliver to {selectedAddress.pincode} yet. Pick another
                address to continue.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Slot */}
        <View>
          <Text variant="section" style={styles.sectionTitle}>
            Delivery slot
          </Text>
          {openSlots.length === 0 ? (
            <Card tone="accent">
              <Text variant="body" tone="muted">
                Every slot for today has closed. Slots reopen each morning at
                6am.
              </Text>
            </Card>
          ) : (
            <SlotPicker
              slots={slots.data ?? []}
              selectedKey={selectedSlotKey}
              onSelect={(slot) => {
                setSelectedSlotKey(slotKey(slot));
                setPreferredSlot(slot);
              }}
            />
          )}
        </View>

        {/* Payment */}
        <View>
          <Text variant="section" style={styles.sectionTitle}>
            Payment
          </Text>
          <View style={styles.list}>
            {PAYMENT_OPTIONS.map((option) => {
              const disabled = option.value === 'COD' && !cart.data.codAvailable;
              const selected = option.value === payment;
              return (
                <Pressable
                  key={option.value}
                  disabled={disabled}
                  onPress={() => setPayment(option.value)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: selected ? colors.accent : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                      borderRadius: radii.lg,
                      opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View style={[styles.optionIcon, { backgroundColor: colors.accent }]}>
                    <Feather name={option.icon} size={15} color={colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="bodyMedium">{option.label}</Text>
                    <Text variant="tiny" tone="muted" style={styles.gap}>
                      {disabled ? 'Not available for this basket' : option.caption}
                    </Text>
                  </View>
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
                </Pressable>
              );
            })}
          </View>
          {payment !== 'COD' ? (
            <Text variant="tiny" tone="muted" style={styles.mockNote}>
              A live payment gateway is not connected yet, so prepaid orders are
              settled in test mode.
            </Text>
          ) : null}
        </View>

        {/* Note */}
        <TextField
          label="Note for the rider (optional)"
          placeholder="Ring the bell twice, second floor…"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={2}
        />

        {/* Bill */}
        <Card>
          <Text variant="label" tone="muted" uppercase>
            Bill details
          </Text>
          <View style={styles.billRows}>
            <BillRow label="Item total" value={rupees(cart.data.bill.subtotalPaise)} />
            {cart.data.bill.discountPaise > 0 ? (
              <BillRow
                label="Discount"
                value={`− ${rupees(cart.data.bill.discountPaise)}`}
              />
            ) : null}
            <BillRow
              label="Delivery"
              value={
                cart.data.bill.deliveryFeePaise === 0
                  ? 'Free'
                  : rupees(cart.data.bill.deliveryFeePaise)
              }
            />
            <BillRow
              label="Handling & ice"
              value={rupees(cart.data.bill.handlingFeePaise)}
            />
          </View>
          <Divider style={styles.divider} />
          <View style={styles.totalRow}>
            <Text variant="cardTitle">To pay</Text>
            <Text variant="price" style={styles.total}>
              {rupees(cart.data.bill.totalPaise)}
            </Text>
          </View>
        </Card>

        {error ? (
          <Text variant="small" tone="danger">
            {error}
          </Text>
        ) : null}
      </KeyboardAwareScrollViewCompat>

      <KeyboardStickyFooter
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <Button
          label={
            payment === 'COD'
              ? `Place order · ${rupees(cart.data.bill.totalPaise)}`
              : `Pay ${rupees(cart.data.bill.totalPaise)}`
          }
          size="lg"
          fullWidth
          disabled={!canPlace}
          loading={createOrder.isPending || payOrder.isPending}
          onPress={placeOrder}
        />
      </KeyboardStickyFooter>
    </Screen>
  );
}

function AddressOption({
  address,
  selected,
  onSelect,
}: {
  address: Address;
  selected: boolean;
  onSelect: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? colors.accent : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderRadius: radii.lg,
          opacity: pressed ? 0.9 : 1,
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
        <View style={styles.labelRow}>
          <Text variant="bodyMedium">{address.label}</Text>
          {address.isDefault ? <Badge label="Default" tone="neutral" /> : null}
          {!address.isServiceable ? (
            <Badge label="Out of range" tone="danger" />
          ) : null}
        </View>
        <Text variant="small" tone="muted" style={styles.gap} numberOfLines={2}>
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ''}, {address.area},{' '}
          {address.city} {address.pincode}
        </Text>
        <Text variant="tiny" tone="muted" style={styles.gap}>
          {address.receiverName} · +91 {address.receiverPhone}
        </Text>
      </View>
    </Pressable>
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
  scroll: { padding: spacing.lg, paddingBottom: 130, gap: spacing.xl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { marginBottom: spacing.md },
  list: { gap: 8 },
  flex: { flex: 1 },
  gap: { marginTop: 3 },
  addBtn: { marginTop: spacing.md, alignSelf: 'flex-start' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  mockNote: { marginTop: 8 },
  billRows: { marginTop: 12, gap: 8 },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { marginVertical: 12 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  total: { fontSize: 18 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
