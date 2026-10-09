import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRequestOtp, useVerifyOtp } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { deepInk, mint, overlay, radii, spacing } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { apiErrorMessage } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/api';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { LogoGlyph } from '@/components/BrandMark';
import { GoogleMark } from '@/components/GoogleMark';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { OtpInput } from '@/components/ui/OtpInput';

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

  /**
   * The two steps live on one screen and cross-fade, rather than being separate
   * routes. Re-entering the phone step has to restore what was typed, and a
   * push/pop would also animate the whole sheet sideways — too heavy for what is
   * really one form in two parts.
   */
  const stepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(stepAnim, {
      toValue: step === 'phone' ? 0 : 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [step, stepAnim]);

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

  const phoneValid = /^[6-9]\d{9}$/.test(phone);

  const onSendOtp = async () => {
    setError(null);
    if (!phoneValid) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    try {
      const challenge = await requestOtp.mutateAsync({ data: { phone } });
      setDevOtp(challenge.devOtp ?? null);
      setMockAuth(Boolean(challenge.mockAuth));
      setOtp('');
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

      // Extract tokens from the URL hash or query parameters:
      const url = new URL(result.url);
      const hashParams = new URLSearchParams(
        url.hash.startsWith('#') ? url.hash.substring(1) : url.hash,
      );
      let accessToken = hashParams.get('access_token');
      let refreshToken = hashParams.get('refresh_token');
      const code = hashParams.get('code') || url.searchParams.get('code');

      if (!accessToken && url.searchParams) {
        accessToken = url.searchParams.get('access_token');
        refreshToken = refreshToken || url.searchParams.get('refresh_token');
      }

      if (!accessToken && code) {
        const { data: codeData, error: exchangeErr } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeErr) throw exchangeErr;
        if (codeData?.session?.access_token) {
          accessToken = codeData.session.access_token;
          refreshToken = codeData.session.refresh_token;
        }
      }

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

  const headline = useMemo(
    () =>
      step === 'phone'
        ? 'The catch of the\nday, at your door.'
        : `Enter the code\nwe just sent.`,
    [step],
  );

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={96}
        showsVerticalScrollIndicator={false}
      >
        {/* ----------------------------- masthead ---------------------------- */}
        <View style={styles.topRow}>
          {/* `mint`, not the default navy — the mark sits on the deep band here
              and a navy glyph on navy is invisible. */}
          <View style={styles.brandRow}>
            <LogoGlyph width={34} color={mint} />
            <Text style={styles.brandWord}>OD Fish Co.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            hitSlop={14}
            style={[styles.close, { borderColor: overlay.hairline }]}
          >
            <Feather name="x" size={17} color="#F8F6F1" />
          </Pressable>
        </View>

        <View style={styles.hero}>
          {step === 'otp' ? (
            <Pressable
              onPress={() => {
                setStep('phone');
                setOtp('');
                setError(null);
              }}
              hitSlop={10}
              style={styles.backRow}
            >
              <Feather name="arrow-left" size={15} color={mint} />
              <Text style={styles.backLabel}>+91 {phone}</Text>
            </Pressable>
          ) : (
            <Text style={styles.kicker}>SIGN IN OR CREATE AN ACCOUNT</Text>
          )}

          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.sub}>
            {step === 'phone'
              ? 'One number, no password. We use it for order updates and to let your rider reach you.'
              : 'Six digits, valid for five minutes.'}
          </Text>
        </View>

        {/* ------------------------------- sheet ---------------------------- */}
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {step === 'phone' ? (
            <Animated.View
              style={{
                opacity: stepAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              }}
            >
              {supabaseConfigured ? (
                <>
                  <Pressable
                    onPress={onGoogleSignIn}
                    disabled={googleLoading}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.googleBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: googleLoading ? 0.6 : pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    {googleLoading ? (
                      <ActivityIndicator size="small" color={colors.foreground} />
                    ) : (
                      <GoogleMark size={18} />
                    )}
                    <Text variant="bodySemi" style={styles.googleLabel}>
                      Continue with Google
                    </Text>
                  </Pressable>

                  <View style={styles.dividerRow}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    <Text variant="small" tone="muted">
                      or use your mobile
                    </Text>
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
                onChangeText={(t) => {
                  setPhone(t.replace(/\D/g, ''));
                  if (error) setError(null);
                }}
                error={error}
                autoFocus
                style={styles.phoneInput}
              />
              <Button
                label="Send OTP"
                onPress={onSendOtp}
                loading={requestOtp.isPending}
                // Disabled until the number is plausible, so the error state is
                // something you have to work at rather than the default.
                disabled={!phoneValid}
                size="lg"
                fullWidth
                style={styles.action}
              />
              <Text variant="small" tone="muted" style={styles.legal}>
                By continuing you agree to our terms of service and privacy
                policy. We only use your number for order updates.
              </Text>
            </Animated.View>
          ) : (
            <Animated.View style={{ opacity: stepAnim }}>
              <Text variant="label" tone="muted" uppercase style={styles.otpLabel}>
                6-digit code
              </Text>
              <OtpInput
                value={otp}
                onChange={(next) => {
                  setOtp(next);
                  if (error) setError(null);
                }}
                onComplete={onVerify}
                error={error}
                autoFocus
              />

              {devOtp ? (
                <View style={[styles.hint, { backgroundColor: colors.accent }]}>
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
                <View style={[styles.hint, { backgroundColor: colors.accent }]}>
                  <Feather name="info" size={13} color={colors.mutedForeground} />
                  <Text variant="small" tone="muted" style={styles.flex}>
                    Demo sign-in is switched on — enter the shared demo code.
                    Real SMS goes live once mobile-number registration clears.
                  </Text>
                </View>
              ) : null}

              <Button
                label="Verify & continue"
                onPress={() => onVerify()}
                loading={verifyOtp.isPending}
                disabled={otp.length !== 6}
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
                  hitSlop={8}
                >
                  <Text variant="smallMedium" tone="primary">
                    Change number
                  </Text>
                </Pressable>
                {secondsLeft > 0 ? (
                  <Text variant="small" tone="muted">
                    Resend in {Math.floor(secondsLeft / 60)}:
                    {String(secondsLeft % 60).padStart(2, '0')}
                  </Text>
                ) : (
                  <Pressable onPress={onSendOtp} hitSlop={8}>
                    <Text variant="smallMedium" tone="primary">
                      Resend OTP
                    </Text>
                  </Pressable>
                )}
              </View>
            </Animated.View>
          )}
        </View>

        {/* Trust strip — the reason to hand over a number at all. */}
        <View style={styles.trust}>
          {[
            { icon: 'shield' as const, label: 'No password\nto remember' },
            { icon: 'bell' as const, label: 'Order updates\nby notification' },
            { icon: 'lock' as const, label: 'Never shared\nor sold' },
          ].map((item) => (
            <View key={item.icon} style={styles.trustItem}>
              <Feather name={item.icon} size={15} color={mint} />
              <Text style={styles.trustLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: deepInk },
  scroll: { paddingHorizontal: spacing.lg, flexGrow: 1 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandWord: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    lineHeight: 21,
    color: '#F8F6F1',
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: { marginTop: spacing.xxl },
  kicker: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 2,
    color: mint,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  backLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 0.4,
    color: mint,
  },
  headline: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.4,
    color: '#F8F6F1',
    marginTop: 10,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: overlay.mutedForeground,
    marginTop: spacing.sm,
    maxWidth: 330,
  },

  sheet: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.xl,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  googleLabel: { lineHeight: 20, fontSize: 14.5 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },

  phoneInput: {
    fontFamily: fonts.monoBold,
    fontSize: 17,
    letterSpacing: 1.2,
  },
  action: { marginTop: spacing.lg },
  legal: { marginTop: spacing.md, lineHeight: 17 },

  otpLabel: { marginBottom: 10 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    marginTop: spacing.md,
    borderRadius: radii.md,
  },
  flex: { flex: 1 },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },

  trust: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  trustItem: { alignItems: 'center', gap: 7, flex: 1 },
  trustLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
    lineHeight: 14,
    textAlign: 'center',
    color: overlay.mutedForeground,
  },
});
