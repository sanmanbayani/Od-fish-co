// Side-effect import: configures the generated API client's base URL and bearer
// token getter. Must run before any screen fires a request.
import '@/lib/api';

import React, { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform, StyleSheet, View } from 'react-native';
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Feather } from '@expo/vector-icons';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import colors, { deepInk } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { AuthProvider } from '@/lib/auth';
import { orderIdFrom } from '@/lib/notifications';
import { hasSeenOnboarding } from '@/lib/onboarding';
import { BrandSplash } from '@/components/BrandSplash';

WebBrowser.maybeCompleteAuthSession();
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // React Query's "window focus" has no native equivalent, so it is driven
      // from AppState below. Without that wiring this flag does nothing on iOS
      // or Android.
      refetchOnWindowFocus: true,
    },
  },
});

/**
 * Returning to the app refetches anything stale — most importantly stock, so a
 * customer who left mid-browse does not come back to a sold-out item still
 * showing as available. This also gates the catalogue poll timers: React Query
 * pauses intervals while unfocused, so a backgrounded app stops polling.
 */
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

/**
 * Tapping an order update opens that order.
 *
 * `useLastNotificationResponse` covers both cases with one code path: a tap
 * while the app is running, and a tap that launched the app from cold. It keeps
 * returning the same response, so the identifier is remembered to avoid pushing
 * the same screen twice.
 *
 * Rendered as a component, not called as a hook, so it can be mounted on
 * iOS/Android only: the notifications native module does not exist on web and
 * the hook throws there before first paint.
 */
function NotificationRouting() {
  const response = Notifications.useLastNotificationResponse();
  const handledRef = React.useRef<string | null>(null);

  useEffect(() => {
    const orderId = orderIdFrom(response);
    if (!orderId || !response) return;

    const key = response.notification.request.identifier;
    if (handledRef.current === key) return;
    handledRef.current = key;

    router.push(`/order/${orderId}`);
  }, [response]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      {Platform.OS !== 'web' ? <NotificationRouting /> : null}
      <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.light.background },
        headerTintColor: colors.light.foreground,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 17 },
        contentStyle: { backgroundColor: colors.light.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/*
        The carousel is the first thing a new customer sees, so it draws without
        a header and without the modal slide — it is the app, not a sheet.
      */}
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: false,
          animation: 'fade',
          // Ink, not cream, so the fade from the splash never flashes paper.
          contentStyle: { backgroundColor: deepInk },
        }}
      />
      <Stack.Screen
        name="login"
        options={{ presentation: 'modal', title: 'Sign in', headerShown: false }}
      />
      <Stack.Screen
        name="link-phone"
        options={{ presentation: 'modal', title: 'Add phone number', headerShown: false }}
      />
      <Stack.Screen name="product/[slug]" options={{ title: '' }} />
      <Stack.Screen name="cart" options={{ title: 'Your basket' }} />
      <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
      <Stack.Screen name="order/[id]" options={{ title: 'Order' }} />
      <Stack.Screen name="addresses" options={{ title: 'Delivery addresses' }} />
      <Stack.Screen
        name="address-form"
        options={{ presentation: 'modal', title: 'Address' }}
      />
      <Stack.Screen
        name="auth-callback"
        options={{ headerShown: false, animation: 'fade' }}
      />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Every screen draws Feather icons. @expo/vector-icons loads its own font
    // asynchronously, which on a real device is not guaranteed to finish before
    // the first paint — the icons then render as blank or partial glyphs. The
    // text fonts below are already gated here, so folding the icon font into the
    // same gate costs nothing and removes the race.
    ...Feather.font,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Inter_500Medium,
    Inter_700Bold,
  });

  // The boot decision and the splash are independent: the first-launch read
  // resolves in milliseconds while the splash holds for most of a second, so the target
  // screen is already painted beneath the overlay by the time it fades. That is
  // what makes the hand-off seamless rather than a second flash.
  const [splashDone, setSplashDone] = useState(false);
  const routed = useRef(false);

  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!ready || routed.current) return;
    routed.current = true;

    // Route underneath the splash. `replace` so the carousel is not left in the
    // back stack — backing out of the shop should never land on a tour.
    hasSeenOnboarding().then((seen) => {
      if (!seen) router.replace('/onboarding');
    });
  }, [ready]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <StatusBar style="dark" />
                <View style={styles.root}>
                  <RootLayoutNav />
                  {/*
                    Held above the navigator so it can fade out over whichever
                    screen the boot decision selected. Unmounted once it has
                    finished, so it costs nothing at runtime.
                  */}
                  {!splashDone ? (
                    <BrandSplash onDone={() => setSplashDone(true)} />
                  ) : null}
                </View>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
