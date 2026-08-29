import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { DeliverySlot } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii } from '@/constants/colors';
import { countdown, deliveryDate } from '@/lib/format';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';

export function SlotPicker({
  slots,
  selectedId,
  onSelect,
}: {
  slots: DeliverySlot[];
  selectedId: string | null;
  onSelect: (slot: DeliverySlot) => void;
}) {
  const colors = useColors();

  return (
    <View style={styles.list}>
      {slots.map((slot) => {
        const selected = slot.id === selectedId;
        const left = countdown(slot.secondsToCutoff);
        return (
          <Pressable
            key={slot.id}
            disabled={!slot.isOpen}
            onPress={() => onSelect(slot)}
            style={({ pressed }) => [
              styles.slot,
              {
                backgroundColor: selected ? colors.accent : colors.card,
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: radii.lg,
                opacity: slot.isOpen ? (pressed ? 0.9 : 1) : 0.5,
              },
            ]}
          >
            <View
              style={[
                styles.radio,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : 'transparent',
                },
              ]}
            >
              {selected ? (
                <Feather name="check" size={11} color={colors.primaryForeground} />
              ) : null}
            </View>
            <View style={styles.slotBody}>
              <Text variant="bodyMedium">{slot.label}</Text>
              <Text variant="tiny" tone="muted" style={styles.meta}>
                {deliveryDate(slot.deliveryDate)} · order by {slot.cutoffTime.slice(0, 5)}
              </Text>
            </View>
            {slot.isOpen ? (
              left ? (
                <Badge label={left} tone="success" />
              ) : null
            ) : (
              <Badge label={slot.closedReason ? 'Closed' : 'Cut off'} tone="neutral" />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBody: { flex: 1 },
  meta: { marginTop: 2 },
});
