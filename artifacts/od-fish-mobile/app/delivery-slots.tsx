import React, { useEffect } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetHomeFeed,
  useListDeliverySlots,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { spacing } from '@/constants/colors';
import { CATALOGUE_POLL_MS } from '@/constants/query';
import { setPreferredSlot, usePreferredSlot } from '@/lib/preferredSlot';
import { SlotPicker, slotKey } from '@/components/SlotPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { Screen } from '@/components/ui/Screen';

export default function DeliverySlotsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const preferredSlot = usePreferredSlot();

  const feed = useGetHomeFeed({
    query: { queryKey: ['home'], refetchInterval: CATALOGUE_POLL_MS },
  });

  const slotsQuery = useListDeliverySlots({
    query: { queryKey: ['slots'] },
  });

  const nextSlot = feed.data?.nextSlot;
  const currentSlot =
    preferredSlot ??
    (nextSlot
      ? {
          key: slotKey(nextSlot),
          label: nextSlot.label,
          deliveryDate: nextSlot.deliveryDate,
        }
      : null);

  // If the picked slot hit its cutoff while browsing, drop it once slot data proves it closed
  useEffect(() => {
    if (!slotsQuery.data || !preferredSlot) return;
    const stillOpen = slotsQuery.data.some(
      (s) => s.isOpen && slotKey(s) === preferredSlot.key,
    );
    if (!stillOpen) setPreferredSlot(null);
  }, [slotsQuery.data, preferredSlot]);

  const onRefresh = () => {
    slotsQuery.refetch();
    feed.refetch();
  };

  return (
    <Screen>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={slotsQuery.isRefetching}
            onRefresh={onRefresh}
          />
        }
      >
        <View style={styles.pickerSection}>
          {slotsQuery.isLoading ? (
            <LoadingView label="Checking dock delivery schedules…" />
          ) : slotsQuery.isError ? (
            <ErrorView
              message="Could not load delivery slots. Check your connection and try again."
              onRetry={() => slotsQuery.refetch()}
            />
          ) : !slotsQuery.data || slotsQuery.data.length === 0 ? (
            <Card tone="accent" style={styles.emptyCard}>
              <Feather name="moon" size={24} color={colors.primary} />
              <Text variant="bodyMedium">All slots closed for today</Text>
              <Text variant="small" tone="muted" style={styles.emptyText}>
                Every delivery run has left the dock. Fresh slots reopen
                tomorrow morning at 6:00 AM.
              </Text>
            </Card>
          ) : (
            <Card style={styles.pickerCard}>
              <SlotPicker
                slots={slotsQuery.data}
                selectedKey={currentSlot?.key ?? null}
                onSelect={(slot) => setPreferredSlot(slot)}
              />
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Simple "Confirm" button pinned to bottom of screen */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <Button
          label="Confirm"
          size="lg"
          fullWidth
          disabled={!currentSlot}
          onPress={() => router.back()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  pickerSection: {
    marginBottom: spacing.lg,
  },
  pickerCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
