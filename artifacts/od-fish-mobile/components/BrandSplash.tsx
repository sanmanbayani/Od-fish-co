import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { LogoGlyph } from '@/components/BrandMark';
import { Text } from '@/components/ui/Text';
import { deepInk, mint, overlay } from '@/constants/colors';
import { fonts } from '@/constants/typography';

/**
 * The animated splash.
 *
 * `expo-splash-screen` shows a static frame until fonts load; this takes over
 * from there so the hand-off to the app is a continuation rather than a flash.
 * It is a plain overlay, not a route — it must survive the navigation that
 * happens underneath it, and it must be able to fade out over whatever screen
 * is already painted.
 *
 * Motion runs on the native driver, so it stays smooth while the JS thread is
 * still busy mounting the first screen and reading the session from storage.
 */

/** Total run time. Kept short — a splash is a toll, not a feature. */
export const SPLASH_DURATION_MS = 2100;

export function BrandSplash({
  onDone,
  /** Fade-out length, after which `onDone` fires. */
  exitMs = 420,
}: {
  onDone: () => void;
  exitMs?: number;
}) {
  const glyph = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const swell = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const veil = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const seq = Animated.parallel([
      // Mark: drops in with a slight overshoot.
      Animated.sequence([
        Animated.delay(80),
        Animated.spring(glyph, {
          toValue: 1,
          damping: 11,
          stiffness: 130,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]),
      // Wordmark, then tagline, each a beat behind the last.
      Animated.sequence([
        Animated.delay(340),
        Animated.timing(word, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(560),
        Animated.timing(tagline, {
          toValue: 1,
          duration: 460,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // The swell: two arcs opening out from the mark, like a wake.
      Animated.sequence([
        Animated.delay(420),
        Animated.timing(swell, {
          toValue: 1,
          duration: 1150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(progress, {
          toValue: 1,
          duration: SPLASH_DURATION_MS - 340,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false, // animates width, not transform
        }),
      ]),
      Animated.sequence([
        Animated.delay(SPLASH_DURATION_MS - exitMs),
        Animated.timing(veil, {
          toValue: 0,
          duration: exitMs,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    seq.start(({ finished }) => {
      if (finished) onDone();
    });

    return () => seq.stop();
    // Deliberately once, on mount: re-running would restart the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[styles.root, { opacity: veil }]}
      pointerEvents="none"
    >
      {/* Wake arcs. Scale and opacity only — no layout work while mounting. */}
      <Animated.View
        style={[
          styles.arc,
          styles.arcOuter,
          {
            opacity: swell.interpolate({
              inputRange: [0, 0.35, 1],
              outputRange: [0, 0.16, 0],
            }),
            transform: [
              {
                scale: swell.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.55, 1.7],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.arc,
          styles.arcInner,
          {
            opacity: swell.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0, 0.22, 0],
            }),
            transform: [
              {
                scale: swell.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1.25],
                }),
              },
            ],
          },
        ]}
      />

      <View style={styles.stack}>
        <Animated.View
          style={{
            opacity: glyph,
            transform: [
              {
                scale: glyph.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.82, 1],
                }),
              },
              {
                translateY: glyph.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          }}
        >
          <LogoGlyph width={96} color={mint} />
        </Animated.View>

        <Animated.View
          style={{
            opacity: word,
            transform: [
              {
                translateY: word.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        >
          <Text style={styles.wordmark}>OD Fish Co.</Text>
        </Animated.View>

        <Animated.View style={{ opacity: tagline }}>
          <Text style={styles.tagline}>ELEVATING FRESH SEAFISH</Text>
        </Animated.View>
      </View>

      {/* Progress hairline, pinned near the bottom. */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const MARK_SIZE = 260;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: deepInk,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 100,
  },
  arc: {
    position: 'absolute',
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    backgroundColor: mint,
  },
  // Held at the centre then pushed outward, giving the wake its offset.
  arcInner: { transform: [{ translateY: -6 }] },
  arcOuter: { transform: [{ translateY: 6 }] },
  stack: { alignItems: 'center', gap: 14 },
  wordmark: {
    fontFamily: fonts.displayBold,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.3,
    color: '#F8F6F1',
  },
  tagline: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 2.6,
    color: overlay.mutedForeground,
  },
  progressTrack: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 74 : 62,
    width: 128,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: overlay.hairline,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
    backgroundColor: mint,
  },
});
