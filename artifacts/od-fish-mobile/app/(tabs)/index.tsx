import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  RefreshControl,
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
import { fonts } from '@/constants/typography';
import { countdown, deliveryDate } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { setPreferredSlot, usePreferredSlot } from '@/lib/preferredSlot';
import { CartBar } from '@/components/CartBar';
import { CategoryTile } from '@/components/CategoryTile';
import { ProductCard } from '@/components/ProductCard';
import { SlotPicker, slotKey } from '@/components/SlotPicker';
import { Text } from '@/components/ui/Text';
import { LoadingView, ErrorView } from '@/components/ui/StateViews';
import { CATALOGUE_POLL_MS } from '@/constants/query';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/ui/Screen';

/* ------------------------------------------------------------------ assets */
const heroFishingBg = require('@/assets/images/hero-fishing-bg.png');
const heroManEating = require('@/assets/images/hero-man-eating.png');

/* ------------------------------------------------------------------ colors */
/** Soft powder-blue used in the Figma hero band background. */
const HERO_BG = '#C8D7F7';
const HERO_SEARCH_BG = '#FFFFFF';
const HERO_SEARCH_BORDER = 'rgba(0,0,0,0.06)';

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

  /* ---- Scroll-driven sticky header ---- */
  const scrollY = useRef(new Animated.Value(0)).current;

  // Background: transparent → white as user scrolls
  const stickyBg = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.97)'],
    extrapolate: 'clamp',
  });
  // Shadow: 0 → visible
  const stickyShadowOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 0.08],
    extrapolate: 'clamp',
  });
  // Address bar collapses as user scrolls (height, opacity, spacing)
  const addressBarHeight = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [44, 0],
    extrapolate: 'clamp',
  });
  const addressBarOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const addressBarMargin = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [spacing.sm, 0],
    extrapolate: 'clamp',
  });
  // Elevation for Android (0 initially, ramps up with scroll)
  const stickyElevation = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 4],
    extrapolate: 'clamp',
  });

  return (
    <Screen>
      {/* ---- Sticky header: address bar + search bar ---- */}
      <Animated.View
        style={[
          styles.stickySearchWrap,
          {
            paddingTop: insets.top + spacing.sm,
            backgroundColor: stickyBg,
            shadowOpacity: stickyShadowOpacity,
            elevation: stickyElevation,
          },
        ]}
      >
        {/* Address bar — collapses on scroll */}
        <Animated.View
          style={[
            styles.heroTopBar,
            {
              height: addressBarHeight,
              opacity: addressBarOpacity,
              marginBottom: addressBarMargin,
              overflow: 'hidden',
            },
          ]}
        >
          <Pressable
            onPress={() => router.push(customer ? '/addresses' : '/login')}
            hitSlop={6}
            style={styles.deliverChip}
          >
            <View style={styles.deliverIcon}>
              <Feather name="map-pin" size={15} color="#FFFFFF" />
            </View>
            <View style={styles.deliverStack}>
              <Text variant="tiny" uppercase style={styles.deliverKicker}>
                Deliver to
              </Text>
              <Text
                variant="smallMedium"
                numberOfLines={1}
                style={styles.deliverName}
              >
                {locationLabel}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/account')}
            hitSlop={6}
            style={styles.profileBtn}
          >
            {initial ? (
              <Text variant="smallMedium" style={{ color: '#3D4460' }}>
                {initial}
              </Text>
            ) : (
              <Feather name="user" size={17} color="#3D4460" />
            )}
          </Pressable>
        </Animated.View>

        {/* Search bar */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(tabs)/shop',
              params: { autofocus: Date.now().toString() },
            })
          }
          style={styles.searchBar}
        >
          <Feather name="search" size={18} color="#9CA3AF" />
          <Text variant="body" style={styles.searchPlaceholder}>
            Search for..
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE + 60 }}
        refreshControl={
          <RefreshControl refreshing={feed.isRefetching} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
      >
        {/* ============================================================== */}
        {/*  HERO — light lavender band with illustration compositing      */}
        {/* ============================================================== */}
        <View
          style={[
            styles.hero,
            { backgroundColor: HERO_BG, paddingTop: insets.top + 104 },
          ]}
        >
          {/* ---- Illustration zone ---- */}
          <View style={styles.heroIllustration}>
            {/* Fishing background — covers the full width, faded */}
            <Image
              source={heroFishingBg}
              style={styles.heroBgImage}
              resizeMode="cover"
            />

            {/* Title text — centered above illustrations */}
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroTitle}>
                Off the boat
              </Text>
              <Text style={styles.heroSubtitle}>
                on your plate
              </Text>
            </View>

            {/* Man eating fish — centered at the bottom */}
            <Image
              source={heroManEating}
              style={styles.heroCharacter}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ---- Delivery slot strip (moved below hero) ---- */}
        {shownSlot ? (
          <Pressable
            onPress={() => setSlotSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose your delivery slot"
            style={[
              styles.slotStripNew,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Feather
              name={preferredSlot ? 'check-circle' : 'clock'}
              size={14}
              color={preferredSlot ? colors.success : colors.mutedForeground}
            />
            <Text variant="smallMedium" style={styles.flex}>
              {deliveryDate(shownSlot.deliveryDate)} · {shownSlot.label}
            </Text>
            {stripHint ? (
              <Text variant="tiny" style={{ color: colors.success }}>
                {stripHint}
              </Text>
            ) : null}
            <Feather
              name="chevron-right"
              size={15}
              color={colors.mutedForeground}
            />
          </Pressable>
        ) : null}

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
                <Animated.ScrollView bounces={false}>
                  <SlotPicker
                    slots={slotList.data}
                    selectedKey={shownSlot?.key ?? null}
                    onSelect={(s) => {
                      setPreferredSlot(s);
                      setSlotSheetOpen(false);
                    }}
                  />
                </Animated.ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Categories */}
        {data.categories.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Shop the counter" />
            <Animated.ScrollView
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
            </Animated.ScrollView>
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
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {data.todaysCatch.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </Animated.ScrollView>
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
      </Animated.ScrollView>

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

/* ================================================================ styles */
const styles = StyleSheet.create({
  /* ------ Sticky header (address bar + search bar) ------ */
  stickySearchWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    // elevation and shadowOpacity are animated via inline style
  },

  /* ------ NEW hero styles ------ */
  hero: {
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  deliverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deliverIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B5068',
  },
  deliverStack: { flexShrink: 1 },
  deliverKicker: {
    color: '#4B5068',
    letterSpacing: 0.8,
    fontSize: 10,
    fontFamily: fonts.bodySemi,
  },
  deliverName: {
    color: '#0B1A3D',
    flexShrink: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },

  /* Search bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: radii.xl,
    backgroundColor: HERO_SEARCH_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HERO_SEARCH_BORDER,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#9CA3AF',
    fontFamily: fonts.body,
    fontSize: 14,
  },

  /* Illustration zone */
  heroIllustration: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
    minHeight: 250,
    position: 'relative',
  },
  heroBgImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    width: '100%',
    opacity: 0.32,
  },
  heroTitleWrap: {
    alignItems: 'center',
    zIndex: 2,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#101B4B',
    fontSize: 32,
    lineHeight: 38,
    fontFamily: fonts.bodyBold,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: '#5C6A8A',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fonts.body,
    textAlign: 'center',
    marginTop: 2,
  },
  heroCharacter: {
    width: 255,
    height: 145,
    zIndex: 3,
    marginBottom: 0,
  },

  /* Delivery slot strip (below hero) */
  slotStripNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
  },

  /* ------ Unchanged styles ------ */
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
