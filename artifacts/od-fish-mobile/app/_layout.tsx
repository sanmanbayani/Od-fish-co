// Side-effect import: configures the generated API client's base URL and bearer
// token getter. Must run before any screen fires a request.
import '@/lib/api';

import React, { useEffect } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
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
import { StatusBar } from 'expo-status-bar';
import colors from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { AuthProvider } from '@/lib/auth';
import { orderIdFrom } from '@/lib/notifications';

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
 */
function useNotificationRouting() {
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
}

function RootLayoutNav() {
  useNotificationRouting();

  return (
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
      <Stack.Screen
        name="login"
        options={{ presentation: 'modal', title: 'Sign in', headerShown: false }}
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
    </Stack>
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <StatusBar style="dark" />
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
