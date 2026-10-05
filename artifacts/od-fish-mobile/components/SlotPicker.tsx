import React, { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';
import type { DeliverySlot } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii } from '@/constants/colors';
import { fonts } from '@/constants/typography';

/**
 * A slot id names a recurring window, not a single delivery — the same window
 * is offered for several days running. Identity has to include the date, or
 * three different days collapse into one as far as React keys and the
 * selection state are concerned.
 */
export function slotKey(slot: Pick<DeliverySlot, 'id' | 'deliveryDate'>) {
  return `${slot.id}|${slot.deliveryDate}`;
}

/**
 * Format slot time label cleanly for grid pill display (e.g. "7 AM - 10 AM" -> "7AM - 10AM").
 */
export function formatSlotPillLabel(label: string): string {
  if (!label) return '';
  // Strip any legacy day prefix (e.g. "Tomorrow, 7 AM - 10 AM")
  const stripped = label.replace(
    /^(?:Today|Tomorrow|[A-Z][a-z]{2},?\s+\d{1,2}\s+[A-Z][a-z]{2}),\s*/i,
    '',
  );
  // Remove spaces before AM/PM ("7 AM" -> "7AM") and standardize dash spacing ("7AM - 10AM")
  return stripped
    .replace(/(\d+)\s+([AP]M)/gi, '$1$2')
    .replace(/\s*[-–—]\s*/g, ' - ')
    .trim();
}

/**
 * Format date for grid group section headers (e.g. "TODAY, 05 OCT", "TUE, 06 OCT").
 */
export function formatSlotDateHeader(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate.toUpperCase();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  const day = target.getDate().toString().padStart(2, '0');
  const month = target.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  if (diffDays === 0) {
    return `TODAY, ${day} ${month}`;
  }

  const weekday = target.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  return `${weekday}, ${day} ${month}`;
}

const GRID_GAP = 10;
const NUM_COLUMNS = 3;

export function SlotPicker({
  slots,
  selectedKey,
  onSelect,
}: {
  slots: DeliverySlot[];
  selectedKey: string | null;
  onSelect: (slot: DeliverySlot) => void;
}) {
  const colors = useColors();
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const onContainerLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - containerWidth) > 1) {
      setContainerWidth(width);
    }
  };

  // Group slots by deliveryDate in chronological order
  const dateGroups = useMemo(() => {
    const map = new Map<string, DeliverySlot[]>();
    for (const slot of slots) {
      const date = slot.deliveryDate;
      const list = map.get(date) ?? [];
      list.push(slot);
      map.set(date, list);
    }

    return Array.from(map.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, items]) => ({
        date,
        slots: items.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }));
  }, [slots]);

  // Calculate dynamic slot item width so 3 columns fit evenly with GRID_GAP
  const itemWidth =
    containerWidth > 0
      ? Math.floor((containerWidth - (NUM_COLUMNS - 1) * GRID_GAP) / NUM_COLUMNS)
      : undefined;

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      {dateGroups.map((group, groupIdx) => (
        <View key={group.date} style={groupIdx > 0 ? styles.groupSpacing : undefined}>
          {/* Section Header: e.g. "TODAY, 05 OCT" with horizontal divider line */}
          <View style={styles.headerRow}>
            <RNText style={[styles.headerText, { color: colors.foreground }]}>
              {formatSlotDateHeader(group.date)}
            </RNText>
            <View
              style={[
                styles.headerDivider,
                { backgroundColor: colors.border },
              ]}
            />
          </View>

          {/* 3-Column Grid of Slots */}
          <View style={styles.grid}>
            {group.slots.map((slot) => {
              const key = slotKey(slot);
              const selected = key === selectedKey;
              const formattedLabel = formatSlotPillLabel(slot.label);

              return (
                <Pressable
                  key={key}
                  disabled={!slot.isOpen}
                  onPress={() => onSelect(slot)}
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.label}, ${formatSlotDateHeader(slot.deliveryDate)}`}
                  accessibilityState={{ selected, disabled: !slot.isOpen }}
                  style={({ pressed }) => [
                    styles.slotPill,
                    itemWidth
                      ? { width: itemWidth }
                      : { flexBasis: '31%', flexGrow: 0, flexShrink: 0 },
                    {
                      backgroundColor: selected
                        ? 'rgba(18, 113, 95, 0.12)'
                        : colors.card,
                      borderColor: selected ? colors.success : colors.border,
                      borderWidth: selected ? 1.5 : 1,
                      borderRadius: radii.md,
                      opacity: slot.isOpen ? (pressed ? 0.8 : 1) : 0.45,
                    },
                  ]}
                >
                  <RNText
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={[
                      styles.slotLabel,
                      {
                        color: selected ? colors.success : colors.foreground,
                        fontFamily: selected ? fonts.bodyBold : fonts.bodyMedium,
                      },
                    ]}
                  >
                    {formattedLabel}
                  </RNText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  groupSpacing: {
    marginTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  headerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.6,
  },
  headerDivider: {
    flex: 1,
    height: 1,
    marginLeft: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  slotPill: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  slotLabel: {
    fontSize: 13,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
