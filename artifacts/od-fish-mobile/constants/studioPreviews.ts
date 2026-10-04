/**
 * Local studio product image overrides for previewing Licious-style
 * studio food photography without touching the backend database.
 */
export const STUDIO_PREVIEWS: Record<string, any> = {
  'surmai-king-fish': require('@/assets/images/studio-surmai.jpg'),
  'white-pomfret': require('@/assets/images/studio-white-pomfret.jpg'),
  'bangda-mackerel': require('@/assets/images/studio-bangda.jpg'),
};

/**
 * Local category image overrides matching Licious circular plated style.
 */
export const CATEGORY_PREVIEWS: Record<string, any> = {
  'fresh-fish': require('@/assets/images/cat-fresh-fish.png'),
  'prawns-shellfish': require('@/assets/images/cat-prawns-shellfish.png'),
  'crab-lobster': require('@/assets/images/cat-crab-lobster.png'),
  'dried-cured': require('@/assets/images/cat-dried-cured.png'),
  'ready-to-cook': require('@/assets/images/cat-ready-to-cook.png'),
};

/**
 * Returns the studio preview asset if available for this slug,
 * otherwise falls back to the database media URL.
 */
export function getProductImage(slug: string, defaultUrl?: string | null) {
  if (STUDIO_PREVIEWS[slug]) {
    return STUDIO_PREVIEWS[slug];
  }
  return defaultUrl;
}
