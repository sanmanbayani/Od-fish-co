import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getListAddressesQueryKey,
  useCheckServiceability,
  useGetHomeFeed,
  useJoinWaitlist,
  useListAddresses,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { mint, overlay, radii, spacing } from '@/constants/colors';
import { apiErrorMessage, countdown, deliveryDate } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { LogoGlyph } from '@/components/BrandMark';
import { CartBar } from '@/components/CartBar';
import { CategoryTile } from '@/components/CategoryTile';
import { ProductCard } from '@/components/ProductCard';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { LoadingView, ErrorView } from '@/components/ui/StateViews';
import { CATALOGUE_POLL_MS } from '@/constants/query';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/ui/Screen';

const BOAT_ART = require('../../assets/images/boat-scene.png');
const FISH_ART = require('../../assets/images/fish-catch.png');

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gridWidth = Math.min((width - spacing.lg * 2 - 12) / 2, 260);
  const { customer } = useAuth();
  const [pincode, setPincode] = useState('');
  const [checked, setChecked] = useState<string | null>(null);
  const [waitlisted, setWaitlisted] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  const feed = useGetHomeFeed({
    query: { queryKey: ['home'], refetchInterval: CATALOGUE_POLL_MS },
  });
  const serviceability = useCheckServiceability(checked ?? '', {
    query: { queryKey: ['serviceability', checked], enabled: Boolean(checked) },
  });
  const joinWaitlist = useJoinWaitlist();

  // Deliver-to chip: the customer's default address, their first one, or a
  // sign-in / add-address prompt. On failure we fall back to the city name —
  // the chip is navigation, not a data claim; errors surface on the
  // addresses screen itself.
  const addresses = useListAddresses({
    query: { enabled: Boolean(customer), queryKey: getListAddressesQueryKey() },
  });
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
  const result = checked ? serviceability.data : undefined;

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

          <Image
            source={BOAT_ART}
            style={styles.heroArt}
            contentFit="contain"
            transition={200}
          />

          {slot ? (
            <Pressable
              onPress={() => router.push('/(tabs)/shop')}
              style={[styles.slotStrip, { borderColor: overlay.hairline }]}
            >
              <Feather name="clock" size={14} color={overlay.mutedForeground} />
              <Text variant="smallMedium" tone="inverse" style={styles.flex}>
                {deliveryDate(slot.deliveryDate)} · {slot.label}
              </Text>
              {countdown(slot.secondsToCutoff) ? (
                <Text variant="tiny" style={{ color: mint }}>
                  {countdown(slot.secondsToCutoff)}
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

        {/* Pincode serviceability */}
        <View style={styles.section}>
          <View
            style={[
              styles.pinCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.xl,
              },
            ]}
          >
            <View style={styles.pinHead}>
              <View style={styles.flex}>
                <Text variant="label" tone="muted" uppercase>
                  Do we deliver to you?
                </Text>
                <Text variant="small" tone="muted" style={styles.pinCaption}>
                  Mumbai pincodes, same-day slots.
                </Text>
              </View>
              <Image source={FISH_ART} style={styles.pinArt} contentFit="contain" />
            </View>
            <View style={styles.pinRow}>
              <TextField
                placeholder="Mumbai pincode"
                keyboardType="number-pad"
                maxLength={6}
                value={pincode}
                onChangeText={(t) => {
                  setPincode(t.replace(/\D/g, ''));
                  setChecked(null);
                  setWaitlisted(false);
                  setWaitlistError(null);
                }}
                containerStyle={styles.flex}
              />
              <Button
                label="Check"
                size="md"
                disabled={pincode.length !== 6}
                onPress={() => setChecked(pincode)}
                style={styles.pinBtn}
              />
            </View>

            {serviceability.isFetching ? (
              <View style={styles.pinResult}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : serviceability.isError ? (
              <View style={styles.pinResult}>
                <Feather name="alert-circle" size={15} color={colors.destructive} />
                <Text variant="small" tone="danger" style={styles.flex}>
                  {apiErrorMessage(
                    serviceability.error,
                    'Could not check that pincode just now. Please try again.',
                  )}
                </Text>
              </View>
            ) : result ? (
              result.serviceable ? (
                <View style={styles.pinResult}>
                  <Feather name="check-circle" size={15} color={colors.success} />
                  <Text variant="small" tone="success" style={styles.flex}>
                    We deliver to {result.areaName ?? result.pincode}
                    {result.codEnabled ? ' · cash on delivery available' : ''}.
                  </Text>
                </View>
              ) : (
                <View style={styles.pinMiss}>
                  <View style={styles.pinResult}>
                    <Feather name="x-circle" size={15} color={colors.destructive} />
                    <Text variant="small" tone="danger" style={styles.flex}>
                      Not on our route yet.
                    </Text>
                  </View>
                  {waitlisted ? (
                    <Text variant="small" tone="muted">
                      Noted — we will message you the day {result.pincode} opens up.
                    </Text>
                  ) : (
                    <Button
                      label="Tell me when you do"
                      variant="outline"
                      size="sm"
                      loading={joinWaitlist.isPending}
                      onPress={async () => {
                        if (!customer?.phone) {
                          router.push('/login');
                          return;
                        }
                        setWaitlistError(null);
                        try {
                          await joinWaitlist.mutateAsync({
                            data: { pincode: result.pincode, phone: customer.phone },
                          });
                          setWaitlisted(true);
                        } catch (err) {
                          // Claiming "noted" on a failed request means the
                          // customer waits for a message that will never come.
                          setWaitlistError(
                            apiErrorMessage(err, 'Could not add your number. Please try again.'),
                          );
                        }
                      }}
                    />
                  )}
                  {waitlistError ? (
                    <Text variant="small" tone="danger">
                      {waitlistError}
                    </Text>
                  ) : null}
                </View>
              )
            ) : null}
          </View>
        </View>

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
  heroArt: { width: '100%', height: 168, marginTop: spacing.sm },
  slotStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
  },
  flex: { flex: 1 },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  sectionHeader: { marginBottom: spacing.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  caption: { marginTop: 2 },
  pinCard: { padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth },
  pinHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pinCaption: { marginTop: 2 },
  pinArt: { width: 86, height: 86, marginVertical: -6 },
  pinRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 },
  pinBtn: { marginTop: 0 },
  pinResult: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  pinMiss: { gap: 10 },
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
