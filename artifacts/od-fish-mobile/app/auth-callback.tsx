import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { radii, spacing } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Immediately complete auth session if open in WebBrowser
WebBrowser.maybeCompleteAuthSession();

/**
 * Parses authentication tokens or error parameters from a redirect URL
 * (supporting both URL hash fragments and query string parameters).
 */
function parseAuthFromUrl(rawUrl: string | null) {
  if (!rawUrl) return { accessToken: null, refreshToken: null, code: null, error: null };
  try {
    const url = new URL(rawUrl);

    // 1. Check hash fragment: #access_token=...&refresh_token=...
    const hash = url.hash.startsWith('#') ? url.hash.substring(1) : url.hash;
    const hashParams = new URLSearchParams(hash);
    let accessToken = hashParams.get('access_token');
    let refreshToken = hashParams.get('refresh_token');
    let code = hashParams.get('code');
    let error = hashParams.get('error_description') || hashParams.get('error');

    // 2. Check search parameters: ?access_token=... or ?code=...
    if (!accessToken && url.search) {
      const searchParams = new URLSearchParams(url.search);
      accessToken = accessToken || searchParams.get('access_token');
      refreshToken = refreshToken || searchParams.get('refresh_token');
      code = code || searchParams.get('code');
      error = error || searchParams.get('error_description') || searchParams.get('error');
    }

    return { accessToken, refreshToken, code, error };
  } catch {
    return { accessToken: null, refreshToken: null, code: null, error: null };
  }
}

export default function AuthCallbackScreen() {
  const colors = useColors();
  const incomingUrl = Linking.useURL();
  const localParams = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  const { signIn, isSignedIn, customer, needsPhone } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;

    let isMounted = true;

    async function handleAuth() {
      try {
        // Collect tokens from incoming deep link URL or local search params
        const parsed = parseAuthFromUrl(incomingUrl);
        let accessToken = parsed.accessToken || localParams.access_token || null;
        let refreshToken = parsed.refreshToken || localParams.refresh_token || null;
        let code = parsed.code || localParams.code || null;
        const authError =
          parsed.error || localParams.error_description || localParams.error || null;

        if (authError) {
          throw new Error(authError);
        }

        // If PKCE authorization code was returned, exchange it for a session
        if (!accessToken && code) {
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (data?.session?.access_token) {
            accessToken = data.session.access_token;
            refreshToken = data.session.refresh_token;
          }
        }

        // If no tokens in URL, check if Supabase already acquired a session
        if (!accessToken) {
          const { data: supaSession } = await supabase.auth.getSession();
          if (supaSession?.session?.access_token) {
            accessToken = supaSession.session.access_token;
            refreshToken = supaSession.session.refresh_token;
          }
        }

        // If user is already signed into app session, smoothly route forward
        if (!accessToken && isSignedIn && customer) {
          processed.current = true;
          if (needsPhone || !customer.phone) {
            router.replace('/link-phone');
          } else {
            router.replace('/(tabs)');
          }
          return;
        }

        if (!accessToken) {
          throw new Error('No authentication token received from Google.');
        }

        processed.current = true;

        // Persist session in local Supabase client
        if (refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }

        // Verify with API server and retrieve/create customer profile
        const apiUrl = `${API_BASE_URL}/api/auth/google`;
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { message?: string }).message ||
              'Google sign-in verification failed. Please try again.',
          );
        }

        const session = await res.json();
        await signIn(session);

        if (!isMounted) return;

        // Route to phone linking if required, otherwise main tabs
        if (session.customer?.needsPhone || !session.customer?.phone) {
          router.replace('/link-phone');
        } else {
          router.replace('/(tabs)');
        }
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Could not complete Google sign-in. Please try again.',
        );
      }
    }

    void handleAuth();

    return () => {
      isMounted = false;
    };
  }, [incomingUrl, localParams, signIn, isSignedIn, customer, needsPhone]);

  return (
    <Screen top bottom style={styles.container}>
      <View style={styles.center}>
        <BrandMark size={48} showWordmark tagline={null} />

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructiveSurface }]}>
            <Text variant="bodySemi" tone="danger" style={styles.errorText}>
              {error}
            </Text>
            <Button
              label="Return to Sign In"
              variant="secondary"
              fullWidth
              onPress={() => router.replace('/login')}
              style={styles.retryBtn}
            />
          </View>
        ) : (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="section" style={styles.title}>
              Signing you in...
            </Text>
            <Text variant="small" tone="muted" style={styles.subtitle}>
              Verifying your Google account with OD Fish Co.
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  center: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: spacing.xl,
  },
  loadingBox: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
  errorBox: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  errorText: {
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.sm,
  },
});
