import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { Text } from '@/components/ui/Text';

/**
 * `Search for “Fish”`, where the quoted word cycles through the catalogue.
 *
 * Two fixed slots take turns. Each has a phase: 0 = waiting below (hidden),
 * 1 = shown, 2 = gone above (hidden). A slot only gets a new word while it is
 * hidden, so the text never changes in view. The incoming word rises in as
 * the outgoing one lifts away. With reduced motion it is a plain crossfade.
 *
 * The rotation pauses whenever the screen is not focused.
 */

const HOLD_MS = 2600;
const SWAP_MS = 420;
const RISE = 9;

export function RotatingSearchHint({
  words,
  style,
  wordStyle,
}: {
  words: string[];
  style?: StyleProp<TextStyle>;
  wordStyle?: StyleProp<TextStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const list = words.length > 0 ? words : ['Fish'];
  const listKey = list.join('|');

  const [slotWords, setSlotWords] = useState<[string, string]>([list[0], list[1 % list.length]]);
  const [swap, setSwap] = useState<{ n: number; to: 0 | 1 } | null>(null);
  const active = useRef<0 | 1>(0);
  const index = useRef(0);

  const phaseA = useSharedValue(1);
  const phaseB = useSharedValue(0);

  // Reset when the word list itself changes (e.g. the feed refreshed).
  useEffect(() => {
    index.current = 0;
    active.current = 0;
    setSlotWords([list[0], list[1 % list.length]]);
    phaseA.set(1);
    phaseB.set(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);

  useFocusEffect(
    useCallback(() => {
      if (list.length < 2) return;
      const id = setInterval(() => {
        const next = (index.current + 1) % list.length;
        index.current = next;
        const to: 0 | 1 = active.current === 0 ? 1 : 0;
        active.current = to;
        // Load the word into the hidden slot; the animation starts after render.
        setSlotWords((prev) => {
          const copy: [string, string] = [prev[0], prev[1]];
          copy[to] = list[next];
          return copy;
        });
        setSwap((s) => ({ n: (s?.n ?? 0) + 1, to }));
      }, HOLD_MS);
      return () => clearInterval(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listKey]),
  );

  useEffect(() => {
    if (!swap) return;
    const timing = { duration: SWAP_MS, easing: Easing.out(Easing.cubic) };
    const incoming = swap.to === 0 ? phaseA : phaseB;
    const outgoing = swap.to === 0 ? phaseB : phaseA;
    incoming.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, timing)));
    outgoing.set(withTiming(2, timing));
  }, [swap, phaseA, phaseB]);

  const rise = reduceMotion ? 0 : RISE;

  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={style} numberOfLines={1}>
        {/* Non-breaking: a trailing plain space collapses on web. */}
        {'Search for\u00A0'}
      </Text>
      <View style={styles.window}>
        {/* Invisible sizer keeps the line height without fixing it in pixels. */}
        <Text style={[style, wordStyle, styles.sizer]} numberOfLines={1}>
          {'“M”'}
        </Text>
        <Slot phase={phaseA} rise={rise} word={slotWords[0]} style={[style, wordStyle]} />
        <Slot phase={phaseB} rise={rise} word={slotWords[1]} style={[style, wordStyle]} />
      </View>
    </View>
  );
}

function Slot({
  phase,
  rise,
  word,
  style,
}: {
  phase: SharedValue<number>;
  rise: number;
  word: string;
  style: StyleProp<TextStyle>;
}) {
  const animated = useAnimatedStyle(() => {
    const p = phase.get();
    return {
      opacity: interpolate(p, [0, 1, 2], [0, 1, 0]),
      transform: [{ translateY: interpolate(p, [0, 1, 2], [rise, 0, -rise]) }],
    };
  });

  return (
    <Animated.View style={[styles.slot, animated]}>
      <Text style={style} numberOfLines={1}>
        {`“${word}”`}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  window: { flex: 1, overflow: 'hidden', justifyContent: 'center' },
  sizer: { opacity: 0 },
  slot: { position: 'absolute', left: 0, right: 0 },
});
