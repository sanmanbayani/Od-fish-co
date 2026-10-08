import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Category } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Text } from '@/components/ui/Text';

/* ------------------------------------------------------------------ */
/* Vector Line-Art Icons (matching Quick-Commerce reference aesthetic) */
/* ------------------------------------------------------------------ */

interface IconProps {
  color?: string;
  size?: number;
}

/** Shopping basket with handles for the "All" counter tab (matching Image 2) */
export function BasketIcon({ color = '#0B1A3D', size = 25 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 10C3.5 9.45 3.95 9 4.5 9H19.5C20.05 9 20.5 9.45 20.5 10L19.2 18.2C19 19.3 18.06 20.1 16.94 20.1H7.06C5.94 20.1 5 19.3 4.8 18.2L3.5 10Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 9L12 4.5L15.5 9"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 14H20"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Fresh fish outline icon (matching Image 1's fish icon) */
export function FishIcon({ color = '#0B1A3D', size = 25 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18.8 12C15.2 7.6 8.5 8 4 12C8.5 16 15.2 16.4 18.8 12Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.2 12L21.5 8.5M18.2 12L21.5 15.5"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="8" cy="11.5" r="1.1" fill={color} />
      <Path
        d="M11 10C11.5 11.2 11.5 12.8 11 14"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Prawn / shrimp outline icon */
export function PrawnIcon({ color = '#0B1A3D', size = 25 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.5 11.5C18.5 10 18 7.5 16 6C14 4.5 11 5 9.5 7C7.5 9.5 6.5 13 8 16C9.2 18.5 12 19.5 14.5 18.5C16.5 17.5 17 15.5 16 14C15 12.5 12.5 12.5 11.5 14"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 6L10.5 8.5M10 8.5L7.5 12M7.2 12.5L6.5 15"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <Path
        d="M16 6C18 4 21 3.5 22 4"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Crab outline icon with claws & legs */
export function CrabIcon({ color = '#0B1A3D', size = 25 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 13C6 9.8 8.7 7.2 12 7.2C15.3 7.2 18 9.8 18 13C18 16.2 15.3 18.8 12 18.8C8.7 18.8 6 16.2 6 13Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <Path
        d="M7.5 9.5C6 7.5 4 6.5 3 7.5C2 8.5 3 10.5 5 11.5"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16.5 9.5C18 7.5 20 6.5 21 7.5C22 8.5 21 10.5 19 11.5"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="10" cy="7.5" r="0.9" fill={color} />
      <Circle cx="14" cy="7.5" r="0.9" fill={color} />
      <Path
        d="M4.5 14L3 16M4.5 16.5L3 19M19.5 14L21 16M19.5 16.5L21 19"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Dried fish outline icon with sun cure marks */
export function DriedFishIcon({ color = '#0B1A3D', size = 25 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19.5 12.5C15.8 8.8 9.2 9.5 4.5 12.5C9.2 15.5 15.8 16.2 19.5 12.5Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 12.5L22 9.5M19 12.5L22 15.5"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 3V5.5M7.5 4.5L9 6.5M16.5 4.5L15 6.5"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path
        d="M9.5 11L8.5 14M12.5 11L11.5 14M15.5 11L14.5 14"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Skillet / cooking pan outline icon with steam */
export function CookingPanIcon({ color = '#0B1A3D', size = 25 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 13.5C4 11.5 5.8 10 8 10H16C18.2 10 20 11.5 20 13.5C20 15.5 18.2 17 16 17H8C5.8 17 4 15.5 4 13.5Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <Path
        d="M20 13.5H23"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M8.5 7C8.5 5.5 9.5 5 9.5 4M12 7C12 5.5 13 5 13 4M15.5 7C15.5 5.5 16.5 5 16.5 4"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
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

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
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
                { opacity: pressed ? 0.75 : 1 },
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
                ]}
                numberOfLines={1}
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

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: 10,
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    paddingTop: 4,
    minWidth: 76,
    paddingHorizontal: 4,
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
  indicator: {
    width: 26,
    height: 3,
    borderRadius: 1.5,
  },
});
