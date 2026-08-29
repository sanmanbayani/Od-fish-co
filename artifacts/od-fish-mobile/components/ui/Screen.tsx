import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

/**
 * Page shell. Tab screens pass `tabBar` so content clears the floating bar;
 * stack screens with a sticky footer pass `edges={['bottom']}` off.
 */
export function Screen({
  children,
  style,
  top = false,
  bottom = false,
  tone = 'background',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  top?: boolean;
  bottom?: boolean;
  tone?: 'background' | 'card' | 'deep';
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bg =
    tone === 'deep' ? colors.deep : tone === 'card' ? colors.card : colors.background;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: bg,
          paddingTop: top ? insets.top : 0,
          paddingBottom: bottom ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Bottom padding that clears the floating tab bar on tab screens. */
export const TAB_BAR_CLEARANCE = 96;

const styles = StyleSheet.create({
  root: { flex: 1 },
});
