/**
 * OD Fish Co. design tokens.
 *
 * Synced from the sibling web artifact (artifacts/od-fish-web/src/index.css)
 * so the landing page, admin console and consumer app share one identity:
 * navy ink on warm cream paper, with a gill-red accent for destructive states.
 */

const colors = {
  light: {
    // Legacy aliases kept for scaffold compatibility
    text: '#0B1A3D',
    tint: '#0B1A3D',

    // Core surfaces — warm cream "paper"
    background: '#F8F6F1',
    foreground: '#0B1A3D',

    // Cards / elevated surfaces
    card: '#FCFAF8',
    cardForeground: '#0B1A3D',

    // Primary action colour — deep navy ink
    primary: '#0B1A3D',
    primaryForeground: '#F8F6F1',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E6E2DA',
    secondaryForeground: '#0B1A3D',

    // Muted / subdued elements
    muted: '#E9E7E2',
    mutedForeground: '#5C6A8A',

    // Accent highlights
    accent: '#EFEDE6',
    accentForeground: '#0B1A3D',

    // Destructive actions — gill red
    destructive: '#CF1736',
    destructiveForeground: '#FFFFFF',

    // Fresh / success — sea green, used for in-stock and delivered states
    success: '#12715F',
    successForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#E2DDD4',
    input: '#E2DDD4',

    // Deep-water surface used for the hero band and sticky cart bar
    deep: '#08142E',
    deepForeground: '#F8F6F1',
  },

  // Sync of the web artifact's --radius (0.375rem). Cards and images step up
  // from this base via the `radii` scale below.
  radius: 6,
};

export const radii = {
  sm: 4,
  md: 6,
  lg: 10,
  xl: 16,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export default colors;
