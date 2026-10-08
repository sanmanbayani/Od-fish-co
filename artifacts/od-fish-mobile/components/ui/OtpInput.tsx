import React, { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { radii } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Text } from '@/components/ui/Text';

/**
 * Six boxed cells for a login code.
 *
 * One real `TextInput` sits transparently over the whole row rather than six
 * inputs being focused in turn. That keeps the platform's own SMS autofill,
 * paste and backspace behaviour intact — splitting the field into six inputs is
 * what breaks autofill on Android, because the OS fills a single element and
 * there is no way to tell it about the other five.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  error,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Fired once the last digit lands, so the caller can verify immediately. */
  onComplete?: (code: string) => void;
  length?: number;
  error?: string | null;
  autoFocus?: boolean;
}) {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const digits = value.split('');
  // The cell the next keystroke will fill — where the caret is drawn.
  const caretIndex = Math.min(digits.length, length - 1);

  const handleChange = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    // Delete removes one digit here; the input's own value is controlled, so
    // the default behaviour would only clear the whole string.
    if (e.nativeEvent.key === 'Backspace' && digits.length > 0) {
      onChange(digits.slice(0, -1).join(''));
    }
  };

  return (
    <View>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessibilityRole="none"
        style={styles.row}
      >
        {Array.from({ length }).map((_, index) => {
          const filled = index < digits.length;
          const isCaret = focused && index === caretIndex && !filled;
          return (
            <View
              key={index}
              style={[
                styles.cell,
                {
                  backgroundColor: colors.card,
                  borderColor: error
                    ? colors.destructive
                    : filled
                      ? colors.primary
                      : isCaret
                        ? colors.primary
                        : colors.border,
                  borderWidth: filled || isCaret ? 1.5 : StyleSheet.hairlineWidth * 2,
                },
              ]}
            >
              {filled ? (
                <Text style={[styles.digit, { color: colors.foreground }]}>
                  {digits[index]}
                </Text>
              ) : isCaret ? (
                <View style={[styles.caret, { backgroundColor: colors.primary }]} />
              ) : null}
            </View>
          );
        })}

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChange}
          onKeyPress={handleKeyPress}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={length}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          // Visually hidden but still a real input: the OS autofill targets it,
          // and the caret box above stands in for the (invisible) real caret.
          style={styles.hidden}
          caretHidden
          accessibilityLabel={`${length}-digit code`}
        />
      </Pressable>
      {error ? (
        <Text variant="small" tone="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const CELL_HEIGHT = 58;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontFamily: fonts.monoBold,
    fontSize: 24,
    lineHeight: 30,
  },
  caret: {
    width: 2,
    height: 24,
    borderRadius: 1,
  },
  hidden: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: CELL_HEIGHT,
    opacity: 0,
  },
  error: { marginTop: 8 },
});
