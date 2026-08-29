import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Order } from '@workspace/api-client-react';
import { useListOrders } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';
import { mediaUrl } from '@/lib/api';
import { deliveryDate, rupees, slotWindow, statusLabel, timestamp } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/ui/Screen';

const LIVE_STATUSES = ['PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY'];

export function statusTone(status: string): 'success' | 'danger' | 'navy' | 'neutral' {
  if (status === 'DELIVERED') return 'success';
  if (status === 'CANCELLED' || status === 'FAILED') return 'danger';
  if (LIVE_STATUSES.includes(status)) return 'navy';
  return 'neutral';
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { isSignedIn, isReady } = useAuth();
  const orders = useListOrders({
    query: { queryKey: ['orders'], enabled: isSignedIn },
  });

  // Keep the header mounted while the stored session is read, otherwise the
  // tab opens as an empty screen and only grows its title a beat later.
  if (!isReady) {
    return (
      <Screen>
        <Header insetTop={insets.top} />
        <LoadingView />
      </Screen>
    );
  }

  if (!isSignedIn) {
    return (
      <Screen top>
        <Header insetTop={insets.top} />
        <EmptyState
          icon="shopping-bag"
          title="No orders yet"
          body="Sign in to see everything you have ordered from the counter."
          actionLabel="Sign in"
          onAction={() => router.push('/login')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header insetTop={insets.top} />
      {orders.isLoading ? (
        <LoadingView />
      ) : orders.isError ? (
        <ErrorView
          message="Could not load your orders."
          onRetry={() => orders.refetch()}
        />
      ) : (orders.data ?? []).length === 0 ? (
        <EmptyState
          icon="shopping-bag"
          title="Nothing ordered yet"
          body="Your first box of fresh fish is a few taps away."
          actionLabel="Browse the counter"
          onAction={() => router.push('/(tabs)/shop')}
        />
      ) : (
        <FlatList
          data={orders.data}
          keyExtractor={(order) => order.id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshing={orders.isRefetching}
          onRefresh={() => orders.refetch()}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

function Header({ insetTop }: { insetTop: number }) {
  return (
    <View style={[styles.head, { paddingTop: insetTop + spacing.md }]}>
      <Text variant="title">Your orders</Text>
    </View>
  );
}

function OrderCard({ order }: { order: Order }) {
  const colors = useColors();
  const live = LIVE_STATUSES.includes(order.status);
  const thumbs = order.items.slice(0, 3);

  return (
    <Pressable
      onPress={() => router.push(`/order/${order.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: live ? colors.primary : colors.border,
          borderRadius: radii.xl,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.cardHead}>
        <View style={styles.flex}>
          <Text variant="smallMedium" tone="muted">
            {order.orderNumber}
          </Text>
          <Text variant="cardTitle" style={styles.status}>
            {statusLabel(order.status)}
          </Text>
        </View>
        <Badge label={statusLabel(order.status)} tone={statusTone(order.status)} />
      </View>

      <View style={styles.thumbs}>
        {thumbs.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.thumbWrap,
              {
                backgroundColor: colors.accent,
                borderColor: colors.card,
                marginLeft: index === 0 ? 0 : -10,
              },
            ]}
          >
            <Image
              source={mediaUrl(item.imageUrl)}
              style={styles.thumb}
              contentFit="cover"
            />
          </View>
        ))}
        <View style={styles.summary}>
          <Text variant="small" tone="muted" numberOfLines={1}>
            {order.items.length === 1
              ? order.items[0].productName
              : `${order.items[0].productName} + ${order.items.length - 1} more`}
          </Text>
          <Text variant="tiny" tone="muted" style={styles.slot}>
            {deliveryDate(order.deliveryDate)} · {slotWindow(order.slotLabel)}
          </Text>
        </View>
      </View>

      <View style={[styles.cardFoot, { borderTopColor: colors.border }]}>
        <Text variant="small" tone="muted">
          {timestamp(order.createdAt)}
        </Text>
        <View style={styles.right}>
          <Text variant="price">{rupees(order.totalPaise)}</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE + 20 },
  sep: { height: 10 },
  card: { borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flex: { flex: 1 },
  status: { marginTop: 2 },
  thumbs: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  thumbWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  summary: { flex: 1, marginLeft: 10 },
  slot: { marginTop: 2 },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
