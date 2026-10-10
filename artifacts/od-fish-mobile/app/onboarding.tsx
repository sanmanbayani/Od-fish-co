import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deepInk, spacing } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { markOnboardingSeen } from '@/lib/onboarding';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

/* ------------------------------------------------------------------ slides */

type Slide = {
  key: string;
  image: number;
  title: string;
  /** One line of support. If it needs a second sentence, the headline is wrong. */
  body: string;
};

/**
 * Three beats: what it is, why it is better, how it reaches you. The net-weight
 * promise lives on the middle slide on purpose — gross vs net is the top
 * complaint in this category, so it is said before the first order, not after.
 */
const SLIDES: Slide[] = [
  {
    key: 'catch',
    image: require('@/assets/images/onboarding-dock-catch.jpg'),
    title: 'Today’s catch,\ndelivered',
    body: 'Landed at Sassoon Dock this morning. At your door the same day.',
  },
  {
    key: 'cut',
    image: require('@/assets/images/onboarding-cut-to-order.jpg'),
    title: 'Cut fresh,\nto order',
    body: 'Cleaned only after you order. Net weight shown before you pay.',
  },
  {
    key: 'door',
    image: require('@/assets/images/onboarding-doorstep.jpg'),
    title: 'Delivered in\nyour slot',
    body: 'Pick a morning, afternoon or evening window anywhere in Mumbai.',
  },
];

const LAST = SLIDES.length - 1;

/** Photo overscan, so the parallax drift never reveals an edge. */
const PHOTO_SCALE = 1.12;

/* ----------------------------------------------------------------- screen */

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const scrollRef = useRef<ScrollViewHandle>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const leaving = useRef(false);

  // The footer is fixed; the copy on each page sits just above it. Measured,
  // not guessed, because the bottom inset varies a lot between phones.
  const [footerHeight, setFooterHeight] = useState(180);

  // One value drives every transition, so photo, copy and indicator move with
  // the finger rather than snapping page to page.
  const offset = useRef(new Animated.Value(0)).current;

  const isLast = index === LAST;

  // Photo fills the top of the screen edge to edge and runs down behind the
  // copy, fading into ink, so a tall phone shows more photo rather than a band
  // of empty navy. Capped by width so the square sources are not over-cropped.
  const photoHeight = Math.round(Math.min(height - footerHeight - 40, width * 1.6));
  const compact = width < 370 || height < 700;

  const leave = useCallback(async (then?: () => void) => {
    if (leaving.current) return;
    leaving.current = true;
    await markOnboardingSeen();
    // `replace`, not `push` — the carousel must not sit in the back stack.
    router.replace('/(tabs)');
    then?.();
  }, []);

  const finish = useCallback(() => void leave(), [leave]);

  // Login is a modal over the shop, so closing it (or finishing sign-in) lands
  // the customer in the storefront, never back on the tour.
  const openLogin = useCallback(
    () => void leave(() => router.push('/login')),
    [leave],
  );

  const goTo = useCallback(
    (next: number) => {
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      indexRef.current = next;
      setIndex(next);
    },
    [width],
  );

  const advance = useCallback(() => {
    if (indexRef.current >= LAST) finish();
    else goTo(indexRef.current + 1);
  }, [finish, goTo]);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: offset } } }], {
        useNativeDriver: true,
        // Track the page from the live offset as well as momentum end: web
        // does not reliably fire momentum events.
        listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          if (next !== indexRef.current && next >= 0 && next <= LAST) {
            indexRef.current = next;
            setIndex(next);
          }
        },
      }),
    [offset, width],
  );

  const onFooterLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (Math.abs(h - footerHeight) > 1) setFooterHeight(h);
  };

  const loginOpacity = offset.interpolate({
    inputRange: [(LAST - 1) * width, LAST * width],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ------------------------------ photos ---------------------------- */}
      <View style={[styles.photoFrame, { height: photoHeight }]}>
        {SLIDES.map((slide, i) => {
          const range = [(i - 1) * width, i * width, (i + 1) * width];
          return (
            <Animated.View
              key={slide.key}
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: offset.interpolate({
                    inputRange: range,
                    outputRange: [0, 1, 0],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    {
                      translateX: offset.interpolate({
                        inputRange: range,
                        outputRange: [width * 0.05, 0, -width * 0.05],
                        extrapolate: 'clamp',
                      }),
                    },
                    { scale: PHOTO_SCALE },
                  ],
                },
              ]}
            >
              <Image
                source={slide.image}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={0}
                accessible={false}
              />
            </Animated.View>
          );
        })}

        {/* Keeps the status bar and Skip legible over a bright sky. */}
        <LinearGradient
          colors={['rgba(4,10,24,0.55)', 'rgba(4,10,24,0)']}
          style={[styles.topShade, { height: insets.top + 72 }]}
        />
        {/* Hands the photo over to the ink panel without a visible seam. */}
        <LinearGradient
          colors={[
            'rgba(8,20,46,0)',
            'rgba(8,20,46,0.45)',
            'rgba(8,20,46,0.9)',
            deepInk,
          ]}
          locations={[0, 0.4, 0.78, 1]}
          style={[styles.bottomShade, { height: photoHeight * 0.58 }]}
        />
      </View>

      {/* ------------------------------ pages ----------------------------- */}
      <Animated.ScrollView
        ref={scrollRef as never}
        horizontal
        pagingEnabled
        bounces={false}
        overScrollMode="never"
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        style={StyleSheet.absoluteFill}
      >
        {SLIDES.map((slide, i) => {
          const range = [(i - 1) * width, i * width, (i + 1) * width];
          return (
            <View
              key={slide.key}
              style={[
                styles.page,
                { width, paddingBottom: footerHeight + spacing.xl },
              ]}
            >
              <Animated.View
                style={{
                  opacity: offset.interpolate({
                    inputRange: range,
                    outputRange: [0, 1, 0],
                    extrapolate: 'clamp',
                  }),
                }}
              >
                <Text
                  accessibilityRole="header"
                  style={[styles.title, compact && styles.titleCompact]}
                >
                  {slide.title}
                </Text>
                <Text style={[styles.body, compact && styles.bodyCompact]}>
                  {slide.body}
                </Text>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      {/* ------------------------------- skip ----------------------------- */}
      <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
        <Pressable
          onPress={finish}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Skip introduction"
          testID="onboarding-skip"
          style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
        >
          <Text style={styles.skipLabel}>Skip</Text>
        </Pressable>
      </View>

      {/* ------------------------------ footer ---------------------------- */}
      <View
        onLayout={onFooterLayout}
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm },
        ]}
      >
        <View
          style={styles.indicator}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}
        >
          {SLIDES.map((slide, i) => (
            <View key={slide.key} style={styles.segment}>
              <Animated.View
                style={[
                  styles.segmentFill,
                  {
                    opacity: offset.interpolate({
                      inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                      outputRange: [0, 1, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <Button
          label={isLast ? 'Start shopping' : 'Next'}
          size="lg"
          fullWidth
          // `inverse`: a light button on the ink panel. `primary` is navy and
          // would disappear into the background.
          variant="inverse"
          onPress={advance}
          testID="onboarding-next"
          style={styles.cta}
        />

        {/* Space is held on every page so the button never jumps. */}
        <Animated.View
          style={[
            styles.loginRow,
            { opacity: loginOpacity, pointerEvents: isLast ? 'auto' : 'none' },
          ]}
        >
          <Pressable
            onPress={openLogin}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Already a customer? Log in"
            accessibilityElementsHidden={!isLast}
            importantForAccessibility={isLast ? 'auto' : 'no-hide-descendants'}
            testID="onboarding-login"
            style={({ pressed }) => [styles.loginHit, pressed && styles.pressed]}
          >
            <Text style={styles.loginLead}>
              Already a customer? <Text style={styles.loginLink}>Log in</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

/** The bits of ScrollView this screen calls; Animated.ScrollView's ref type is loose. */
type ScrollViewHandle = { scrollTo: (o: { x: number; animated: boolean }) => void };

/* ---------------------------------------------------------------- styles */

const WHITE = '#FFFFFF';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: deepInk },

  photoFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0 },

  page: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.9,
    color: WHITE,
  },
  titleCompact: { fontSize: 30, lineHeight: 35, letterSpacing: -0.7 },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23,
    color: 'rgba(255,255,255,0.74)',
    marginTop: spacing.md,
    maxWidth: 330,
  },
  bodyCompact: { fontSize: 15, lineHeight: 21 },

  topBar: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 2,
  },
  skip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(4,10,24,0.38)',
  },
  skipLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    lineHeight: 17,
    color: WHITE,
  },
  pressed: { opacity: 0.6 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
  },
  indicator: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.xl,
  },
  segment: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.24)',
    overflow: 'hidden',
  },
  segmentFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WHITE,
  },
  cta: { borderRadius: 14 },
  loginRow: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  loginHit: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  loginLead: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.66)',
  },
  loginLink: { fontFamily: fonts.bodySemi, color: WHITE },
});
