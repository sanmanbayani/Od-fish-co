import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LogoGlyph } from '@/components/BrandMark';
import { deepInk } from '@/constants/colors';

/**
 * The in-app half of the splash.
 *
 * The native splash (app.json) paints the same mark, at the same width, on the
 * same ink background. This overlay picks up from that frame without any
 * entrance motion, holds for a beat while the first screen mounts underneath,
 * then fades once. Any added motion here reads as a second, different splash.
 *
 * It is an overlay, not a route: it must survive the navigation that happens
 * beneath it and fade out over whichever screen is already painted.
 */

/** Must match `imageWidth` of the expo-splash-screen plugin in app.json. */
export const SPLASH_MARK_WIDTH = 120;

/** Time the mark sits still before fading. Kept short — a splash is a toll. */
const HOLD_MS = 450;

export function BrandSplash({
  onDone,
  exitMs = 300,
}: {
  onDone: () => void;
  /** Fade-out length, after which `onDone` fires. */
  exitMs?: number;
}) {
  const veil = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(HOLD_MS),
      Animated.timing(veil, {
        toValue: 0,
        duration: exitMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    anim.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => anim.stop();
    // Deliberately once, on mount: re-running would restart the fade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[styles.root, { opacity: veil }]}
      accessibilityLabel="OD Fish Co."
    >
      {/* Light icons on ink while the overlay is up; the root bar style returns on unmount. */}
      <StatusBar style="light" />
      <LogoGlyph width={SPLASH_MARK_WIDTH} color="#F8F6F1" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: deepInk,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 100,
    pointerEvents: 'none',
  },
});
