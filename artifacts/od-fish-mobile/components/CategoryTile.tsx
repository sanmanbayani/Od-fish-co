import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import type { Category } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Text } from '@/components/ui/Text';

/* ------------------------------------------------------------------ */
/* Category icons                                                      */
/* ------------------------------------------------------------------ */
/*
 * One line-art family on a 24px grid: 1.6px round strokes, filled dots for
 * eyes. Each icon draws the actual product (a whole fish, a curled prawn, a
 * crab with pincers, fish hung out to dry, a fish in the pan) so the bar
 * reads at a glance without the labels.
 */

interface IconProps {
  color?: string;
  size?: number;
}

const STROKE = 1.6;

function Lines({ d, color, width = STROKE }: { d: string[]; color: string; width?: number }) {
  return (
    <>
      {d.map((path) => (
        <Path
          key={path}
          d={path}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
}

/** Side-on fish: body, forked tail, dorsal and belly fins, gill line. */
const FISH_BODY = [
  'M2.8 12C5.4 8.2 10.6 7 14.8 9.4C15.9 10 16.9 10.9 17.6 12C16.9 13.1 15.9 14 14.8 14.6C10.6 17 5.4 15.8 2.8 12Z',
  'M17.6 12L21.2 8.6V15.4L17.6 12Z',
  'M8.4 9.5C9.2 11 9.2 13 8.4 14.5',
];
const FISH_DORSAL = 'M9 8.1L10.8 5.8L13.6 8.7';
const FISH_BELLY = 'M11 15.9L12.2 17.8L13.8 15.4';

/** The fish drawn at any position/scale; stroke is compensated so it stays 1.6px. */
function FishShape({
  color,
  transform,
  scale = 1,
  fins = 'both',
}: {
  color: string;
  transform?: string;
  scale?: number;
  fins?: 'both' | 'dorsal' | 'none';
}) {
  const d = [...FISH_BODY];
  if (fins !== 'none') d.push(FISH_DORSAL);
  if (fins === 'both') d.push(FISH_BELLY);
  return (
    <G transform={transform}>
      <Lines d={d} color={color} width={STROKE / scale} />
      <Circle cx="5.9" cy="11.3" r="0.9" fill={color} />
    </G>
  );
}

/** All: a market basket with today's fish on top. */
export function BasketIcon({ color = '#0B1A3D', size = 25 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Lines
        color={color}
        d={[
          'M3 11.5H21',
          'M4.2 11.5L5.5 18.9C5.7 19.9 6.5 20.6 7.6 20.6H16.4C17.5 20.6 18.3 19.9 18.5 18.9L19.8 11.5',
          'M9 14.4V17.8',
          'M12 14.4V17.8',
          'M15 14.4V17.8',
        ]}
      />
      <FishShape
        color={color}
        scale={0.52}
        fins="none"
        transform="translate(12 6.6) rotate(-18) scale(0.52) translate(-12 -12)"
      />
    </Svg>
  );
}

/** Fish: a whole fresh fish. */
export function FishIcon({ color = '#0B1A3D', size = 25 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <FishShape color={color} />
    </Svg>
  );
}

/** Prawns: curled, segmented body with a tail fan and long antennae. */
export function PrawnIcon({ color = '#0B1A3D', size = 25 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Lines
        color={color}
        d={[
          'M17.6 6.3C13 4.3 7 6.6 5.6 11.4C4.4 15.6 7.4 19.6 11.8 19.6',
          'M17.8 10C14.4 8.6 10.6 10 9.8 12.6C9.2 14.6 10.4 16.4 12.2 16.4',
          'M17.6 6.3C19.5 7 19.8 9.3 17.8 10',
          'M12.2 16.4L15.8 15.6L14.8 18.1L15.8 20.6L11.8 19.6',
          'M8.4 8.5L11 10.7',
          'M5.9 12.4L9.6 13.2',
          'M7.4 17.2L10.4 15.6',
          'M18.9 7.2L22 4.4',
          'M19.2 8.6L22.4 8.4',
        ]}
      />
      <Circle cx="16.4" cy="7.7" r="0.85" fill={color} />
    </Svg>
  );
}

/** Crabs: shell, two open pincers, three legs a side, eyes on stalks. */
export function CrabIcon({ color = '#0B1A3D', size = 25 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Lines
        color={color}
        d={[
          'M6.5 14.2C6.5 11.9 9 10.2 12 10.2C15 10.2 17.5 11.9 17.5 14.2C17.5 16.5 15 18.2 12 18.2C9 18.2 6.5 16.5 6.5 14.2Z',
          'M7.8 11.6L5.4 8.6',
          'M5.4 8.6C3.5 8.2 2.6 6.3 3.4 4.6L5.1 6.5L5.7 4.2C7.2 5.4 7.1 7.6 5.4 8.6Z',
          'M16.2 11.6L18.6 8.6',
          'M18.6 8.6C20.5 8.2 21.4 6.3 20.6 4.6L18.9 6.5L18.3 4.2C16.8 5.4 16.9 7.6 18.6 8.6Z',
          'M6.6 14.6L3.2 13.8',
          'M7.2 16.6L3.8 18',
          'M9.2 17.8L7 20.6',
          'M17.4 14.6L20.8 13.8',
          'M16.8 16.6L20.2 18',
          'M14.8 17.8L17 20.6',
          'M10.4 10.2V8.8',
          'M13.6 10.2V8.8',
        ]}
      />
      <Circle cx="10.4" cy="8.3" r="0.8" fill={color} />
      <Circle cx="13.6" cy="8.3" r="0.8" fill={color} />
    </Svg>
  );
}

/** Dried Fish: two fish hung tail-up from a drying line. */
export function DriedFishIcon({ color = '#0B1A3D', size = 25 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Lines color={color} d={['M2.5 3.8H21.5', 'M7.5 3.8V5.4', 'M16.5 3.8V5.4']} />
      <FishShape
        color={color}
        scale={0.62}
        fins="dorsal"
        transform="translate(7.5 12.6) rotate(-90) scale(0.62) translate(-12 -12)"
      />
      <FishShape
        color={color}
        scale={0.62}
        fins="dorsal"
        transform="translate(16.5 12.6) rotate(-90) scale(0.62) translate(-12 -12)"
      />
    </Svg>
  );
}

/** Ready to Cook: a cleaned fish already in the pan, steam rising. */
export function CookingPanIcon({ color = '#0B1A3D', size = 25 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Lines
        color={color}
        d={[
          'M3.5 14C3.5 10.4 6.4 7.5 10 7.5C13.6 7.5 16.5 10.4 16.5 14C16.5 17.6 13.6 20.5 10 20.5C6.4 20.5 3.5 17.6 3.5 14Z',
          'M16 11.6L21.4 8.6',
          'M6.4 14C7.6 12.3 10.4 11.9 12.4 14C10.4 16.1 7.6 15.7 6.4 14Z',
          'M12.4 14L14 12.8V15.2L12.4 14Z',
          'M7.8 5.2C7.2 4.4 8.4 3.6 7.8 2.6',
          'M11.6 5.2C11 4.4 12.2 3.6 11.6 2.6',
        ]}
      />
      <Circle cx="8.2" cy="13.7" r="0.55" fill={color} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Category Mapping Helper                                             */
/* ------------------------------------------------------------------ */

export interface CategoryNavTab {
  id: string;
  slug: string;
  name: string;
  badge?: string;
  icon: React.ComponentType<IconProps>;
}

export function getCategoryNavItems(categories: Category[]): CategoryNavTab[] {
  const allTab: CategoryNavTab = {
    id: 'all',
    slug: 'all',
    name: 'All',
    icon: BasketIcon,
  };

  const mapped = categories.map((cat) => {
    switch (cat.slug) {
      case 'fresh-fish':
        return {
          id: cat.id,
          slug: cat.slug,
          name: 'Fish',
          icon: FishIcon,
        };
      case 'prawns-shellfish':
        return {
          id: cat.id,
          slug: cat.slug,
          name: 'Prawns',
          icon: PrawnIcon,
        };
      case 'crab-lobster':
        return {
          id: cat.id,
          slug: cat.slug,
          name: 'Crabs',
          icon: CrabIcon,
        };
      case 'dried-cured':
        return {
          id: cat.id,
          slug: cat.slug,
          name: 'Dried Fish',
          icon: DriedFishIcon,
        };
      case 'ready-to-cook':
        return {
          id: cat.id,
          slug: cat.slug,
          name: 'Ready to Cook',
          badge: 'New',
          icon: CookingPanIcon,
        };
      default:
        return {
          id: cat.id,
          slug: cat.slug,
          name: cat.name,
          icon: FishIcon,
        };
    }
  });

  return [allTab, ...mapped];
}

/* ------------------------------------------------------------------ */
/* Main Category Navigation Bar (Matches Reference Images 1 & 2)      */
/* ------------------------------------------------------------------ */

export function CategoryNav({
  categories,
  selectedSlug = 'all',
  onSelect,
}: {
  categories: Category[];
  selectedSlug?: string;
  onSelect: (slug: string) => void;
}) {
  const colors = useColors();
  const tabs = getCategoryNavItems(categories);
  // Tab width follows the bar's own width so that, on any phone, exactly five
  // whole tabs fill the first fold; the rest appear only on scroll.
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth =
    barWidth > 0
      ? Math.max(MIN_TAB_WIDTH, (barWidth - BAR_INSET * 2) / TABS_IN_VIEW)
      : MIN_TAB_WIDTH;

  return (
    <View
      style={[styles.container, { borderBottomColor: colors.border }]}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w !== barWidth) setBarWidth(w);
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const isActive = tab.slug === selectedSlug;
          const IconComp = tab.icon;
          const iconColor = isActive ? colors.foreground : colors.mutedForeground;

          return (
            <Pressable
              key={tab.slug}
              onPress={() => onSelect(tab.slug)}
              style={({ pressed }) => [
                styles.tabItem,
                { width: tabWidth, opacity: pressed ? 0.75 : 1 },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <View style={styles.iconWrap}>
                <IconComp color={iconColor} size={25} />
                {tab.badge ? (
                  <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.foreground : colors.mutedForeground,
                    fontFamily: isActive ? fonts.bodyBold : fonts.bodyMedium,
                  },
                  // Long names (e.g. "Ready to Cook") step down so they fit the fixed tab width.
                  tab.name.length > 9 && styles.tabLabelLong,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {tab.name}
              </Text>

              {/* Active underline indicator bar — aligns directly on baseline */}
              <View
                style={[
                  styles.indicator,
                  {
                    backgroundColor: isActive ? colors.primary : 'transparent',
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Legacy wrapper alias for backward compatibility */
export function CategoryTile({
  category,
  onPress,
}: {
  category: Category;
  onPress: () => void;
  width?: number;
}) {
  return null;
}

/** Exactly five whole tabs in the first fold, no partly cut-off tab. */
const TABS_IN_VIEW = 5;
const BAR_INSET = spacing.sm;
const MIN_TAB_WIDTH = 56;

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  scrollContent: {
    paddingHorizontal: BAR_INSET,
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    paddingTop: 4,
    paddingHorizontal: 2,
  },
  iconWrap: {
    width: 32,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radii.pill,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontFamily: fonts.bodyBold,
    letterSpacing: 0.2,
    lineHeight: 11,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 6,
    marginBottom: 7,
    textAlign: 'center',
  },
  tabLabelLong: { fontSize: 10.5, letterSpacing: -0.2 },
  indicator: {
    width: 26,
    height: 3,
    borderRadius: 1.5,
  },
});
