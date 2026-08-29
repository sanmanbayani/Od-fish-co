import { Platform, View, ViewProps } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

/**
 * A footer pinned to the bottom of the screen that rides up with the keyboard.
 *
 * Our sticky footers hold the primary action ("Save address", "Place order").
 * Pinned to the bottom of the window they sit *behind* an open keyboard, so a
 * customer who has just finished typing cannot see or reach the button.
 *
 * Web falls back to a plain absolute View — the browser handles its own
 * keyboard insets and the native module is not meaningful there.
 */
export function KeyboardStickyFooter({ children, style, ...props }: ViewProps) {
  const wrap = [{ position: 'absolute' as const, left: 0, right: 0, bottom: 0 }, style];

  if (Platform.OS === 'web') {
    return (
      <View style={wrap} {...props}>
        {children}
      </View>
    );
  }
  return (
    <KeyboardStickyView style={wrap} offset={{ closed: 0, opened: 0 }} {...props}>
      {children}
    </KeyboardStickyView>
  );
}
