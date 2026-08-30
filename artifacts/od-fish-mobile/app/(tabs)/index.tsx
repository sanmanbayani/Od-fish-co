import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getListAddressesQueryKey,
  useGetHomeFeed,
  useListAddresses,
  useListDeliverySlots,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { mint, overlay, radii, spacing } from '@/constants/colors';
import { countdown, deliveryDate } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { setPreferredSlot, usePreferredSlot } from '@/lib/preferredSlot';
import { LogoGlyph } from '@/components/BrandMark';
import { CartBar } from '@/components/CartBar';
import { CategoryTile } from '@/components/CategoryTile';
import { ProductCard } from '@/components/ProductCard';
import { SlotPicker, slotKey } from '@/components/SlotPicker';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { LoadingView, ErrorView } from '@/components/ui/StateViews';
import { CATALOGUE_POLL_MS } from '@/constants/query';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/ui/Screen';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gridWidth = Math.min((width - spacing.lg * 2 - 12) / 2, 260);
  const { customer } = useAuth();

  const feed = useGetHomeFeed({
    query: { queryKey: ['home'], refetchInterval: CATALOGUE_POLL_MS },
  });

  // Deliver-to chip: the customer's default address, their first one, or a
  // sign-in / add-address prompt. On failure we fall back to the city name —
  // the chip is navigation, not a data claim; errors surface on the
  // addresses screen itself.
  const addresses = useListAddresses({
    query: { enabled: Boolean(customer), queryKey: getListAddressesQueryKey() },
  });

  // Slot sheet: the strip in the hero opens a picker, and the chosen slot is
  // remembered for this session so checkout starts from it. The full list is
  // fetched only once the sheet opens — the feed already carries the next slot.
  const [slotSheetOpen, setSlotSheetOpen] = useState(false);
  const preferredSlot = usePreferredSlot();
  const slotList = useListDeliverySlots({
    query: { queryKey: ['slots'], enabled: slotSheetOpen },
  });

  // If the picked slot hit its cutoff while the customer browsed, drop it the
  // moment fresh slot data proves it closed — never display a dead choice.
  useEffect(() => {
    if (!slotSheetOpen || !slotList.data || !preferredSlot) return;
    const stillOpen = slotList.data.some(
      (s) => s.isOpen && slotKey(s) === preferredSlot.key,
    );
    if (!stillOpen) setPreferredSlot(null);
  }, [slotSheetOpen, slotList.data, preferredSlot]);
  const deliverTo = addresses.data?.find((a) => a.isDefault) ?? addresses.data?.[0];
  const locationLabel = !customer
    ? 'Set your location'
    : addresses.isLoading
      ? 'Finding your address…'
      : deliverTo
        ? deliverTo.area
        : addresses.isError
          ? 'Mumbai'
          : 'Add delivery address';
  const initial = customer?.fullName?.trim()?.[0]?.toUpperCase() ?? null;

  const onRefresh = useCallback(() => {
    feed.refetch();
  }, [feed]);

  if (feed.isLoading) {
    return (
      <Screen top>
        <LoadingView label="Bringing in the catch…" />
      </Screen>
    );
  }

  if (feed.isError || !feed.data) {
    return (
      <Screen top>
        <ErrorView
          message="We could not reach the fish counter. Check your connection and try again."
          onRetry={() => feed.refetch()}
        />
      </Screen>
    );
  }

  const data = feed.data;
  const slot = data.nextSlot;
  const shownSlot =
    preferredSlot ??
    (slot
      ? { key: slotKey(slot), label: slot.label, deliveryDate: slot.deliveryDate }
      : null);
  const stripHint =
    (slot && shownSlot && slotKey(slot) === shownSlot.key
      ? countdown(slot.secondsToCutoff)
      : null) ?? (preferredSlot ? 'Your slot' : null);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE + 60 }}
        refreshControl={
          <RefreshControl refreshing={feed.isRefetching} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Deep-water header band */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.deep, paddingTop: insets.top + spacing.md },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.push(customer ? '/addresses' : '/login')}
              hitSlop={6}
              style={styles.locationChip}
            >
              <View style={styles.pinBubble}>
                <Feather name="map-pin" size={15} color={mint} />
              </View>
              <View style={styles.locationStack}>
                <Text variant="tiny" uppercase style={styles.locationKicker}>
                  Deliver to
                </Text>
                <View style={styles.locationRow}>
                  <Text
                    variant="smallMedium"
                    tone="inverse"
                    numberOfLines={1}
                    style={styles.locationName}
                  >
                    {locationLabel}
                  </Text>
                  <Feather
                    name="chevron-down"
                    size={14}
                    color={overlay.mutedForeground}
                  />
                </View>
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/account')}
              hitSlop={6}
              style={[
                styles.profileBtn,
                { borderColor: overlay.hairline, backgroundColor: overlay.fill },
              ]}
            >
              {initial ? (
                <Text variant="smallMedium" tone="inverse">
                  {initial}
                </Text>
              ) : (
                <Feather name="user" size={17} color={colors.deepForeground} />
              )}
            </Pressable>
          </View>

          <View style={styles.brandRow}>
            <LogoGlyph width={46} color={colors.deepForeground} />
            <Badge
              label={data.storeOpen ? 'Counter open' : 'Counter closed'}
              tone={data.storeOpen ? 'success' : 'neutral'}
            />
          </View>

          <Text variant="hero" tone="inverse" style={styles.headline}>
            Off the boat,{'\n'}on your plate.
          </Text>
          <Text variant="small" style={styles.subline}>
            {customer?.fullName
              ? `Fresh from Sassoon Dock this morning, ${customer.fullName.split(' ')[0]} — cleaned and cut to order.`
              : 'Sassoon Dock’s morning catch, cleaned and cut to order for Mumbai kitchens.'}
          </Text>

          {shownSlot ? (
            <Pressable
              onPress={() => setSlotSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Choose your delivery slot"
              style={[styles.slotStrip, { borderColor: overlay.hairline }]}
            >
              <Feather
                name={preferredSlot ? 'check-circle' : 'clock'}
                size={14}
                color={preferredSlot ? mint : overlay.mutedForeground}
              />
              <Text variant="smallMedium" tone="inverse" style={styles.flex}>
                {deliveryDate(shownSlot.deliveryDate)} · {shownSlot.label}
              </Text>
              {stripHint ? (
                <Text variant="tiny" style={{ color: mint }}>
                  {stripHint}
                </Text>
              ) : null}
              <Feather
                name="chevron-right"
                size={15}
                color={overlay.mutedForeground}
              />
            </Pressable>
          ) : (
            <View style={[styles.slotStrip, { borderColor: overlay.hairline }]}>
              <Feather name="moon" size={14} color={overlay.mutedForeground} />
              <Text variant="smallMedium" tone="inverse" style={styles.flex}>
                No slots open right now — check back in the morning.
              </Text>
            </View>
          )}
        </View>

        <Modal
          visible={slotSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setSlotSheetOpen(false)}
        >
          <View style={styles.sheetRoot}>
            <Pressable
              style={styles.sheetScrim}
              onPress={() => setSlotSheetOpen(false)}
              accessibilityLabel="Close the slot picker"
            />
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + spacing.lg,
                },
              ]}
            >
              <View
                style={[styles.sheetHandle, { backgroundColor: colors.border }]}
              />
              <Text variant="section">Delivery slots</Text>
              <Text variant="body" tone="muted" style={styles.sheetSub}>
                Pick when the catch should reach you — it will already be
                selected at checkout.
              </Text>
              {slotList.isLoading ? (
                <ActivityIndicator
                  color={colors.primary}
                  style={styles.sheetBusy}
                />
              ) : slotList.isError ? (
                <ErrorView
                  message="Could not load delivery slots. Check your connection and try again."
                  onRetry={() => slotList.refetch()}
                />
              ) : !slotList.data || slotList.data.length === 0 ? (
                <Text variant="body" tone="muted" style={styles.sheetBusy}>
                  Every slot has closed for now. Fresh slots open each morning
                  at 6am.
                </Text>
              ) : (
                <ScrollView bounces={false}>
                  <SlotPicker
                    slots={slotList.data}
                    selectedKey={shownSlot?.key ?? null}
                    onSelect={(s) => {
                      setPreferredSlot(s);
                      setSlotSheetOpen(false);
                    }}
                  />
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Categories */}
        {data.categories.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Shop the counter" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {data.categories.map((category) => (
                <CategoryTile
                  key={category.id}
                  category={category}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/shop',
                      params: { category: category.slug },
                    })
                  }
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Today's catch */}
        {data.todaysCatch.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title="Today's catch"
              caption="Landed this morning at Sassoon Dock"
              onSeeAll={() => router.push('/(tabs)/shop')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {data.todaysCatch.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Popular */}
        {data.popular.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title="Mumbai's regulars"
              caption="What our kitchens reorder"
              onSeeAll={() => router.push('/(tabs)/shop')}
            />
            <View style={styles.grid}>
              {data.popular.map((product) => (
                <ProductCard key={product.id} product={product} width={gridWidth} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Trust strip */}
        <View style={styles.section}>
          <View
            style={[
              styles.trust,
              { backgroundColor: colors.accent, borderRadius: radii.xl },
            ]}
          >
            {[
              { icon: 'droplet' as const, label: 'Never frozen' },
              { icon: 'scissors' as const, label: 'Cut to order' },
              { icon: 'thermometer' as const, label: '0–4 °C to your door' },
            ].map((item) => (
              <View key={item.label} style={styles.trustItem}>
                <Feather name={item.icon} size={16} color={colors.primary} />
                <Text variant="tiny" tone="muted" style={styles.trustLabel}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <CartBar offset={TAB_BAR_CLEARANCE - 46} />
    </Screen>
  );
}

function SectionHeader({
  title,
  caption,
  onSeeAll,
}: {
  title: string;
  caption?: string;
  onSeeAll?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text variant="section" style={styles.flex}>
          {title}
        </Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8} style={styles.seeAll}>
            <Text variant="smallMedium" tone="primary">
              See all
            </Text>
            <Feather name="chevron-right" size={15} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {caption ? (
        <Text variant="small" tone="muted" style={styles.caption}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pinBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: overlay.fill,
  },
  locationStack: { flexShrink: 1 },
  locationKicker: { color: overlay.mutedForeground, letterSpacing: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationName: { flexShrink: 1 },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  headline: { marginTop: spacing.md },
  subline: { color: overlay.mutedForeground, marginTop: 6, lineHeight: 19 },
  slotStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
  },
  flex: { flex: 1 },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 26, 61, 0.55)',
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '78%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radii.pill,
    marginBottom: spacing.md,
  },
  sheetSub: { marginTop: 4, marginBottom: spacing.md },
  sheetBusy: { marginVertical: spacing.lg },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  sectionHeader: { marginBottom: spacing.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  caption: { marginTop: 2 },
  rail: { gap: 12, paddingRight: spacing.lg },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  trust: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  trustItem: { alignItems: 'center', gap: 6, flex: 1 },
  trustLabel: { textAlign: 'center' },
});
