/**
 * Order push notifications.
 *
 * The API sends an update at each step of an order — placed, confirmed,
 * packed, out for delivery, delivered — addressed to the Expo push tokens
 * registered against the signed-in customer. This module is the phone's half:
 * ask permission, hand the token to the API, and take the customer to the
 * right order when they tap the notification.
 *
 * Nothing in here is allowed to break the app. A phone that refuses
 * notifications, an emulator that has no push support, or an API that is
 * momentarily down must all leave the customer with a working storefront —
 * they simply do not get notified.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  registerPushDevice,
  unregisterPushDevice,
} from '@workspace/api-client-react';
import colors from '@/constants/colors';

/**
 * The token this install last registered. Kept so sign-out can tell the API
 * exactly which device to forget, even if the push service is unreachable at
 * that moment.
 */
const TOKEN_KEY = 'odfish.push.token';

/** Must match the `channelId` the API puts on every message it sends. */
const ANDROID_CHANNEL_ID = 'orders';

/**
 * Show order updates while the app is open too. An update that arrives as the
 * customer is looking at the app is exactly the moment it is most useful, and
 * without this Android and iOS both swallow it.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Remote push is a native capability that Expo Go no longer carries: on
 * Android it throws outright, and on iOS it cannot issue a token for this
 * project. Detecting it here keeps the dev build usable — everything else in
 * the app works, notifications are simply skipped until it runs as a real
 * build.
 */
function pushUnavailableReason(): string | null {
  if (Platform.OS === 'web') {
    // Device.isDevice is true in a browser, so this must be checked first —
    // the web build has no push token to issue.
    return 'Push notifications are not supported in the web preview.';
  }
  if (isRunningInExpoGo()) {
    return 'Expo Go cannot receive push notifications — install a real build to test them.';
  }
  if (!Device.isDevice) {
    return 'Push notifications need a physical device.';
  }
  return null;
}

/**
 * Expo addresses notifications by project, so the token cannot be issued
 * without the EAS project id. It is written into the app config by the build,
 * so a locally-run bundle legitimately has none.
 */
function projectId(): string | null {
  const fromExtra = Constants.expoConfig?.extra?.eas?.projectId;
  const fromEas = Constants.easConfig?.projectId;
  return (
    (typeof fromExtra === 'string' ? fromExtra : null) ??
    (typeof fromEas === 'string' ? fromEas : null)
  );
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Order updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: colors.light.primary,
  });
}

/**
 * Ask once, politely.
 *
 * iOS only ever shows the system prompt on the first ask; after that the
 * answer is settled and the customer has to change it in Settings. So a
 * refusal is respected silently rather than re-prompted at every launch.
 */
async function requestPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Whatever registration is currently in the air.
 *
 * Registration is fired and not awaited (it can show a permission prompt), so a
 * customer who signs out a second later would otherwise race it: sign-out finds
 * nothing stored, the registration lands afterwards, and the handset keeps
 * receiving the previous account's order updates. Sign-out waits on this handle
 * so it always knows what there is to remove.
 */
let inFlightSync: Promise<void> | null = null;

/**
 * Bound a best-effort network call. Resolves either way — teardown on sign-out
 * must never hang the app on a slow connection.
 */
function withTimeout(work: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    void work.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      () => {
        clearTimeout(timer);
        resolve();
      },
    );
  });
}

/**
 * Tell the API this phone should receive updates for the signed-in customer.
 *
 * Safe to call on every launch: the API keys devices by token, so repeat
 * registrations just refresh the row. Call it only while signed in — the
 * endpoint needs the customer's session.
 */
export function syncPushRegistration(): Promise<void> {
  const run = registerThisDevice();
  inFlightSync = run.finally(() => {
    if (inFlightSync === run) inFlightSync = null;
  });
  return inFlightSync;
}

async function registerThisDevice(): Promise<void> {
  try {
    const unavailable = pushUnavailableReason();
    if (unavailable) {
      console.info(`[push] ${unavailable}`);
      return;
    }

    const id = projectId();
    if (!id) {
      console.info(
        '[push] No EAS project id in the app config, so no push token can be issued.',
      );
      return;
    }

    await ensureAndroidChannel();

    if (!(await requestPermission())) {
      console.info('[push] Notification permission was not granted.');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: id,
    });

    await registerPushDevice({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    // Never surface this. The customer did not ask for notifications right now;
    // they asked for a fish shop.
    console.warn('[push] Could not register this device', error);
  }
}

/**
 * Detach this phone on sign-out, so the next person to use it does not receive
 * the previous customer's order updates.
 *
 * Must run before the session token is cleared — the endpoint is authenticated.
 */
export async function clearPushRegistration(): Promise<void> {
  // A registration started moments ago may still be landing. Let it finish
  // first, or it would re-attach this handset to the account being left.
  if (inFlightSync) await withTimeout(inFlightSync, 4000);

  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);

  try {
    if (token) await withTimeout(unregisterPushDevice({ token }), 4000);
  } finally {
    // Cleared whatever the API said. The local marker is only a record of what
    // to detach; keeping it after a sign-out would strand this device on the
    // old account with nothing left to unregister it.
    await AsyncStorage.removeItem(TOKEN_KEY).catch(() => undefined);
  }
}

/** The order a notification points at, if it points at one. */
export function orderIdFrom(
  response: Notifications.NotificationResponse | null | undefined,
): string | null {
  const data = response?.notification.request.content.data as
    | { orderId?: unknown }
    | undefined;
  return typeof data?.orderId === 'string' ? data.orderId : null;
}
