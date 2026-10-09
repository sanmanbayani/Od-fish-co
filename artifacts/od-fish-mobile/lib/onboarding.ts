/**
 * First-run marker for the onboarding carousel.
 *
 * The value is a version, not a boolean, so a future copy change can re-show
 * the carousel to existing customers by bumping ONBOARDING_VERSION instead of
 * having to clear their storage. Read once at launch; a missing or unreadable
 * value is treated as "not seen", which errs toward showing the tour rather
 * than silently skipping it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'odfish.onboarding.version';

/** Bump to re-present the carousel after a material copy or art change. */
export const ONBOARDING_VERSION = 1;

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
    return stored !== null && Number(stored) >= ONBOARDING_VERSION;
  } catch {
    // Storage unreadable — do not block the customer behind a tour they may
    // have already seen and cannot dismiss.
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, String(ONBOARDING_VERSION));
  } catch {
    // Worst case the carousel shows again next launch. Not worth surfacing.
  }
}
