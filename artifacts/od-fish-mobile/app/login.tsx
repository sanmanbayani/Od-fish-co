import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRequestOtp, useVerifyOtp } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { overlay, radii, spacing } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { apiErrorMessage } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/api';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { BrandMark } from '@/components/BrandMark';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Screen } from '@/components/ui/Screen';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [mockAuth, setMockAuth] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const startCountdown = (seconds: number) => {
    setSecondsLeft(seconds);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const onSendOtp = async () => {
    setError(null);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    try {
      const challenge = await requestOtp.mutateAsync({ data: { phone } });
      setDevOtp(challenge.devOtp ?? null);
      setMockAuth(Boolean(challenge.mockAuth));
      setStep('otp');
      startCountdown(challenge.expiresInSeconds || 300);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the OTP. Try again.'));
    }
  };

  const onVerify = async (code = otp) => {
    setError(null);
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    try {
      const session = await verifyOtp.mutateAsync({ data: { phone, otp: code } });
      await signIn(session);
      close();
    } catch (err) {
      setError(apiErrorMessage(err, 'That code did not match. Try again.'));
      setOtp('');
    }
  };

  const onGoogleSignIn = async () => {
    if (!supabaseConfigured) {
      setError('Google sign-in is not configured in this build.');
      return;
    }
    setError(null);
    setGoogleLoading(true);
    try {
      // Build the redirect URL using the app's deep link scheme.
      // Supabase will redirect here after Google consent, appending the
      // access_token and refresh_token as URL hash fragments.
      const redirectUrl = Linking.createURL('auth-callback');

      const { data, error: supaError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (supaError || !data.url) {
        setError(supaError?.message ?? 'Could not start Google sign-in.');
        return;
      }

      // Open the OAuth consent page in a browser. On return, the result
      // contains the full redirect URL with tokens in the hash fragment.
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
      );

      if (result.type !== 'success' || !result.url) {
        // User cancelled or dismissed the browser.
        return;
      }

      // Extract tokens from the URL hash: #access_token=...&refresh_token=...
      const url = new URL(result.url);
      const hashParams = new URLSearchParams(
        url.hash.startsWith('#') ? url.hash.substring(1) : url.hash,
      );
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken) {
        setError('Could not complete Google sign-in. Please try again.');
        return;
      }

      // Set the session on the Supabase client so it persists across app restarts.
      if (refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }

      // Send the Supabase token to our API for verification and customer upsert.
      const apiUrl = `${API_BASE_URL}/api/auth/google`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          (body as { message?: string }).message ??
            'Google sign-in failed. Please try again.',
        );
        return;
      }

      const session = await res.json();
      await signIn(session);

      // If the customer needs to add a phone number, go there instead of home.
      if (session.customer?.needsPhone) {
        router.replace('/link-phone');
      } else {
        close();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Google sign-in failed.',
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen tone="deep">
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={72}
      >
        <View style={styles.topRow}>
          <BrandMark size={38} showWordmark={false} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            hitSlop={12}
            style={[styles.close, { borderColor: overlay.hairline }]}
          >
            <Feather name="x" size={17} color={colors.deepForeground} />
          </Pressable>
        </View>

        <Text variant="hero" tone="inverse" style={styles.headline}>
          {step === 'phone' ? 'The catch of the\nday, at your door.' : 'Enter the code'}
        </Text>
        <Text style={[styles.sub, { color: overlay.mutedForeground }]} variant="body">
          {step === 'phone'
            ? 'Sign in with your mobile number. No password to remember.'
            : `We sent a 6-digit code to +91 ${phone}.`}
        </Text>

        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderRadius: radii.xl },
          ]}
        >
          {step === 'phone' ? (
            <>
              {supabaseConfigured ? (
                <>
                  <Pressable
                    onPress={onGoogleSignIn}
                    disabled={googleLoading}
                    style={({ pressed }) => [
                      styles.googleBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: radii.lg,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    {googleLoading ? (
                      <ActivityIndicator size="small" color={colors.foreground} />
                    ) : (
                      <Feather name="chrome" size={18} color={colors.foreground} />
                    )}
                    <Text variant="bodyMedium" style={styles.googleLabel}>
                      Continue with Google
                    </Text>
                  </Pressable>

                  <View style={styles.dividerRow}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    <Text variant="small" tone="muted" style={styles.dividerText}>or</Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  </View>
                </>
              ) : null}

              <TextField
                label="Mobile number"
                prefix="+91"
                placeholder="98XXXXXXXX"
                keyboardType="number-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                returnKeyType="done"
                onSubmitEditing={onSendOtp}
                maxLength={10}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                error={error}
                autoFocus
              />
              <Button
                label="Send OTP"
                onPress={onSendOtp}
                loading={requestOtp.isPending}
                size="lg"
                fullWidth
                style={styles.action}
              />
              <Text variant="small" tone="muted" style={styles.legal}>
                By continuing you agree to our terms of service and privacy
                policy. We only use your number for order updates.
              </Text>
            </>
          ) : (
            <>
              <TextField
                label="6-digit OTP"
                placeholder="······"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                returnKeyType="done"
                onSubmitEditing={() => onVerify()}
                maxLength={6}
                value={otp}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, '');
                  setOtp(digits);
                  if (digits.length === 6) onVerify(digits);
                }}
                error={error}
                autoFocus
                style={styles.otpInput}
              />
              {devOtp ? (
                <View
                  style={[
                    styles.devHint,
                    { backgroundColor: colors.accent, borderRadius: radii.md },
                  ]}
                >
                  <Feather name="info" size={13} color={colors.mutedForeground} />
                  <Text variant="small" tone="muted" style={styles.flex}>
                    No SMS provider is live yet, so your code is{' '}
                    <Text variant="smallMedium" tone="primary">
                      {devOtp}
                    </Text>
                    .
                  </Text>
                </View>
              ) : mockAuth ? (
                <View
                  style={[
                    styles.devHint,
                    { backgroundColor: colors.accent, borderRadius: radii.md },
                  ]}
                >
                  <Feather name="info" size={13} color={colors.mutedForeground} />
                  <Text variant="small" tone="muted" style={styles.flex}>
                    Demo sign-in is switched on — enter the shared demo code. Real
                    SMS goes live once mobile-number registration clears.
                  </Text>
                </View>
              ) : null}
              <Button
                label="Verify & continue"
                onPress={() => onVerify()}
                loading={verifyOtp.isPending}
                size="lg"
                fullWidth
                style={styles.action}
              />
              <View style={styles.resendRow}>
                <Pressable
                  onPress={() => {
                    setStep('phone');
                    setOtp('');
                    setError(null);
                  }}
                >
                  <Text variant="smallMedium" tone="primary">
                    Change number
                  </Text>
                </Pressable>
                {secondsLeft > 0 ? (
                  <Text variant="small" tone="muted">
                    Expires in {Math.floor(secondsLeft / 60)}:
                    {String(secondsLeft % 60).padStart(2, '0')}
                  </Text>
                ) : (
                  <Pressable onPress={onSendOtp}>
                    <Text variant="smallMedium" tone="primary">
                      Resend OTP
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      </KeyboardAwareScrollViewCompat>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, flexGrow: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: { marginTop: spacing.xxl },
  sub: { marginTop: spacing.sm, maxWidth: 320 },
  sheet: { marginTop: spacing.xl, padding: spacing.lg },
  action: { marginTop: spacing.lg },
  legal: { marginTop: spacing.md, lineHeight: 17 },
  otpInput: {
    fontFamily: fonts.monoBold,
    fontSize: 22,
    letterSpacing: Platform.OS === 'web' ? 8 : 10,
  },
  devHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    marginTop: spacing.md,
  },
  flex: { flex: 1 },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    marginBottom: spacing.sm,
  },
  googleLabel: {
    lineHeight: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {},
});
