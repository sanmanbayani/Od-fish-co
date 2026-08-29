/**
 * Type scale for OD Fish Co. mobile.
 *
 * Fraunces (serif) is the display face used on the web artifact's headlines —
 * it carries the "market chalkboard" voice. Plus Jakarta Sans handles all body
 * and UI copy. Space Mono is reserved for numerals that should read like a
 * hand-written slate: prices, order numbers and the delivery OTP.
 */

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemi: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  mono: 'Inter_500Medium',
  monoBold: 'Inter_700Bold',
} as const;

export const type = {
  hero: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  section: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24 },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  bodySemi: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  smallMedium: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
  tiny: { fontFamily: fonts.bodyMedium, fontSize: 10.5, lineHeight: 14 },
  price: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 20 },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
  },
} as const;
