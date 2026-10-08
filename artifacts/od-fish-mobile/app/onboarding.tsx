import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deepInk, mint, overlay, radii, spacing } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { markOnboardingSeen } from '@/lib/onboarding';
import { LogoGlyph } from '@/components/BrandMark';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

/* ------------------------------------------------------------------ slides */

type Slide = {
  key: string;
  /** Art. `aspect` drives the illustration box so text never gets pushed off. */
  image: number;
  aspect: number;
  /** Framing hints for the illustration container. */
  kicker: string;
  title: string;
  body: string;
  /** Short proof-points shown under the copy. */
  points?: string[];
};

/**
 * Four beats, in the order a new customer needs them: what this is, why it is
 * fresher, what they will actually receive, and how the delivery works. The
 * weight slide exists because gross-vs-net is the single most common source of
 * complaint in this category — better to explain it before the first order than
 * to defend it after.
 */
const SLIDES: Slide[] = [
  {
    key: 'boat',
    image: require('@/assets/images/boat-scene.png'),
    aspect: 1200 / 656,
    kicker: 'FRESH FROM THE BOAT',
    title: 'Off the boat,\non your plate',
    body: 'Fish that came in at Sassoon Dock this morning, cleaned and cut to order, at your door by the window you picked.',
    points: ['Same-day catch', 'Cut to order', '0–4 °C to your door'],
  },
  {
    key: 'catch',
    image: require('@/assets/images/fish-catch.png'),
    aspect: 1,
    kicker: 'LANDED THIS MORNING',
    title: 'Know today’s\ncatch before you buy',
    body: 'Surmai, bangda, pomfret — what landed overnight and how much of it is left. No guessing what turns up in the box.',
    points: ['Live stock counts', 'Straight from the dock'],
  },
  {
    key: 'weight',
    image: require('@/assets/images/fish-catch.png'),
    aspect: 1,
    kicker: 'NO SURPRISES',
    title: 'You see the net\nweight up front',
    body: 'Sea fish never weighs the same twice, so we price the pack and never the gram. Every option shows its gross weight and its net edible weight before you pay.',
    points: ['Gross and net disclosed', 'Priced per pack, not per gram'],
  },
  {
    key: 'delivery',
    image: require('@/assets/images/boat-scene.png'),
    aspect: 1200 / 656,
    kicker: 'ON YOUR SCHEDULE',
    title: 'Choose the window.\nWe do the rest',
    body: 'Morning, afternoon or evening slots across Mumbai. Track your order, and hand it over with a code so only your household takes delivery.',
    points: ['Slots across the day', 'Tracking and a handover code'],
  },
];

/* ----------------------------------------------------------------- screen */

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  // One shared value drives every transition, so the dots, the illustration
  // cross-fade and the copy all stay in step with the finger.
  const offset = useRef(new Animated.Value(0)).current;

  const isLast = index === SLIDES.length - 1;

  const finish = useCallback(async () => {
    await markOnboardingSeen();
    // `replace`, not `push` — the carousel must not sit in the back stack.
    router.replace('/(tabs)');
  }, []);

  const advance = useCallback(() => {
    if (isLast) {
      void finish();
      return;
    }
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  }, [index, isLast, finish, width]);

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { x: offset } } }],
        { useNativeDriver: false },
      ),
    [offset],
  );

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  // Illustration height, clamped so it never crowds out the copy on a short
  // screen. The art is the hero, but the words are the point.
  const artHeight = Math.min(height * 0.36, 320);

  return (
    <View style={styles.root}>
      {/* ------------------------------- skip ------------------------------ */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <LogoGlyph width={34} color={overlay.mutedForeground} />
        <Pressable
          onPress={finish}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Skip the introduction"
          style={[styles.skip, { borderColor: overlay.hairline }]}
        >
          <Text variant="smallMedium" style={styles.skipLabel}>
            Skip
          </Text>
        </Pressable>
      </View>

      {/* ---------------------------- carousel ---------------------------- */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumEnd}
        // Paging is the interaction; let it own the horizontal axis.
        directionalLockEnabled
        bounces={false}
        style={styles.scroller}
      >
        {SLIDES.map((slide, i) => {
          // Each slide fades and drifts as it hands over to the next.
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const artOpacity = offset.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          });
          const artShift = offset.interpolate({
            inputRange,
            outputRange: [width * 0.18, 0, -width * 0.18],
            extrapolate: 'clamp',
          });
          const copyOpacity = offset.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          });
          const copyShift = offset.interpolate({
            inputRange,
            outputRange: [width * 0.12, 0, -width * 0.12],
            extrapolate: 'clamp',
          });

          return (
            <View key={slide.key} style={[styles.slide, { width }]}>
              <Animated.View
                style={[
                  styles.artBox,
                  {
                    height: artHeight,
                    opacity: artOpacity,
                    transform: [{ translateX: artShift }],
                  },
                ]}
              >
                {/* Halo behind the art, tinted per slide's own framing. */}
                <View style={styles.halo} />
                <Image
                  source={slide.image}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </Animated.View>

              <Animated.View
                style={[
                  styles.copy,
                  { opacity: copyOpacity, transform: [{ translateX: copyShift }] },
                ]}
              >
                <Text style={styles.kicker}>{slide.kicker}</Text>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.body}>{slide.body}</Text>

                {slide.points ? (
                  <View style={styles.points}>
                    {slide.points.map((point) => (
                      <View key={point} style={styles.point}>
                        <View style={styles.pointDot}>
                          <Feather name="check" size={10} color={deepInk} />
                        </View>
                        <Text variant="small" style={styles.pointLabel}>
                          {point}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Animated.View>
            </View>
          );
        })}
      </ScrollView>

      {/* ------------------------------ footer ---------------------------- */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => {
            // Dots track the finger continuously, not just page-to-page.
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = offset.interpolate({
              inputRange,
              outputRange: [7, 22, 7],
              extrapolate: 'clamp',
            });
            const dotOpacity = offset.interpolate({
              inputRange,
              outputRange: [0.32, 1, 0.32],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={slide.key}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity: dotOpacity },
                ]}
              />
            );
          })}
        </View>

        <Button
          label={isLast ? 'Start shopping' : 'Next'}
          size="lg"
          fullWidth
          // `inverse`, not `primary`: this CTA sits on the deep navy band, where
          // the navy primary button is invisible against its own background.
          variant="inverse"
          onPress={advance}
          trailing={
            <Feather
              name={isLast ? 'arrow-right' : 'chevron-right'}
              size={16}
              color={deepInk}
            />
          }
          style={styles.cta}
        />

        {isLast ? (
          <Text variant="small" style={styles.footNote}>
            You can change your address and slot at checkout.
          </Text>
        ) : (
          <Pressable onPress={finish} hitSlop={10}>
            <Text variant="small" style={styles.footNote}>
              I have ordered before
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- styles */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: deepInk },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    zIndex: 2,
  },
  skip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  skipLabel: { color: '#F8F6F1' },

  scroller: { flex: 1 },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },

  artBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  halo: {
    position: 'absolute',
    width: '104%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: mint,
    opacity: 0.07,
  },

  copy: {},
  kicker: {
    fontFamily: fonts.bodySemi,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 2.2,
    color: mint,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 31,
    lineHeight: 37,
    letterSpacing: -0.4,
    color: '#F8F6F1',
    marginTop: 10,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 22,
    color: overlay.mutedForeground,
    marginTop: 12,
  },

  points: { marginTop: 18, gap: 9 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pointDot: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointLabel: { color: '#F8F6F1' },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 8,
  },
  dot: {
    height: 7,
    borderRadius: 4,
    backgroundColor: mint,
  },
  cta: { marginTop: 2 },
  footNote: {
    textAlign: 'center',
    color: overlay.mutedForeground,
    paddingVertical: Platform.OS === 'android' ? 2 : 0,
  },
});
