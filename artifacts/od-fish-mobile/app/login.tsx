import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRequestOtp, useVerifyOtp } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { apiErrorMessage } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/api';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { GoogleMark } from '@/components/GoogleMark';
import { Text } from '@/components/ui/Text';
import { OtpInput } from '@/components/ui/OtpInput';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 260;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const heroBg = require('@/assets/images/hero-fishing-bg.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const heroMan = require('@/assets/images/hero-man-eating.png');

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

  /* =============================== PHONE STEP ============================== */

  const renderPhoneStep = () => (
    <Animated.View
      style={{
        opacity: stepAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0],
        }),
      }}
    >
      <Text style={styles.heading}>Sign in or create an account</Text>

      {/* ---- phone input row ---- */}
      <View style={styles.phoneRow}>
        {/* Country code chip */}
        <View style={[styles.countryChip, { borderColor: colors.border }]}>
          <Text style={styles.flag}>🇮🇳</Text>
          <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
        </View>

        {/* Phone number field */}
        <View style={[styles.phoneField, { borderColor: error ? colors.destructive : colors.border }]}>
          <Text style={styles.phonePrefix}>+91</Text>
          <View style={styles.phoneSeparator} />
          <Animated.View style={styles.phoneInputWrap}>
            {/* We use a native TextInput for the phone field */}
            <PhoneTextInput
              value={phone}
              onChangeText={(t: string) => {
                setPhone(t.replace(/\D/g, ''));
                if (error) setError(null);
              }}
              onSubmitEditing={onSendOtp}
              placeholder="Enter mobile number"
              placeholderTextColor={colors.mutedForeground}
              colors={colors}
            />
          </Animated.View>
        </View>
      </View>

      {error ? (
        <Text variant="small" tone="danger" style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      {/* ---- Continue button ---- */}
      <Pressable
        accessibilityRole="button"
        onPress={onSendOtp}
        disabled={!phoneValid || requestOtp.isPending}
        style={({ pressed }) => [
          styles.continueBtn,
          {
            backgroundColor: colors.primary,
            opacity: !phoneValid || requestOtp.isPending ? 0.45 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {requestOtp.isPending ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.continueBtnLabel, { color: colors.primaryForeground }]}>
            Continue
          </Text>
        )}
      </Pressable>

      {/* ---- "or" divider ---- */}
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text variant="small" tone="muted" style={styles.dividerText}>
          or
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* ---- Google sign-in ---- */}
      {supabaseConfigured ? (
        <Pressable
          onPress={onGoogleSignIn}
          disabled={googleLoading}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.googleBtn,
            {
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
          <Text style={[styles.googleLabel, { color: colors.mutedForeground }]}>
            Continue with google
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );

  /* ================================ OTP STEP =============================== */

  const renderOtpStep = () => (
    <Animated.View style={{ opacity: stepAnim }}>
      {/* Back navigation */}
      <Pressable
        onPress={() => {
          setStep('phone');
          setOtp('');
          setError(null);
        }}
        hitSlop={10}
        style={styles.backRow}
      >
        <Feather name="arrow-left" size={18} color={colors.primary} />
        <Text style={[styles.backLabel, { color: colors.primary }]}>
          +91 {phone}
        </Text>
      </Pressable>

      <Text style={[styles.heading, { marginTop: 16 }]}>
        Enter verification code
      </Text>
      <Text variant="body" tone="muted" style={styles.otpSub}>
        We've sent a 6-digit code to +91 {phone}
      </Text>

      <View style={styles.otpSection}>
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
      </View>

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

      {/* ---- Verify button ---- */}
      <Pressable
        accessibilityRole="button"
        onPress={() => onVerify()}
        disabled={otp.length !== 6 || verifyOtp.isPending}
        style={({ pressed }) => [
          styles.continueBtn,
          {
            backgroundColor: colors.primary,
            opacity: otp.length !== 6 || verifyOtp.isPending ? 0.45 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {verifyOtp.isPending ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.continueBtnLabel, { color: colors.primaryForeground }]}>
            Verify & continue
          </Text>
        )}
      </Pressable>

      {/* ---- Resend row ---- */}
      <View style={styles.resendRow}>
        {secondsLeft > 0 ? (
          <Text variant="small" tone="muted">
            Resend code in {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, '0')}
          </Text>
        ) : (
          <Pressable onPress={onSendOtp} hitSlop={8}>
            <Text variant="smallMedium" tone="primary" style={styles.resendLink}>
              Resend OTP
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );

  /* =============================== RENDER ================================== */

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bottomOffset={96}
        showsVerticalScrollIndicator={false}
      >
        {/* =============================== HERO ============================== */}
        <View style={styles.heroBanner}>
          <Image
            source={heroBg}
            style={styles.heroBgImage}
            resizeMode="cover"
          />
          <Image
            source={heroMan}
            style={styles.heroManImage}
            resizeMode="contain"
          />
          {/* Soft bottom fade from illustration into the white card */}
          <View style={styles.heroFade} />
        </View>

        {/* ============================= FORM CARD ============================ */}
        <View style={[styles.formCard, { paddingBottom: insets.bottom + 24 }]}>
          {step === 'phone' ? renderPhoneStep() : renderOtpStep()}

          {/* ---- Footer legal text ---- */}
          <View style={styles.footer}>
            <Text variant="small" tone="muted" style={styles.footerText}>
              By continuing, you agree to our
            </Text>
            <View style={styles.footerLinks}>
              <Pressable hitSlop={4}>
                <Text variant="small" style={styles.footerLink}>
                  Terms of service
                </Text>
              </Pressable>
              <Text variant="small" tone="muted" style={styles.footerLinkSep}>
                {'  '}
              </Text>
              <Pressable hitSlop={4}>
                <Text variant="small" style={styles.footerLink}>
                  Privacy Policy
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

/* ================================== PHONE TEXT INPUT ============================ */

/**
 * Separate component for the phone TextInput so we don't pull in the full
 * TextField with its own label / error wrappers — the new design inlines the
 * input directly inside the country-code row.
 */


function PhoneTextInput({
  value,
  onChangeText,
  onSubmitEditing,
  placeholder,
  placeholderTextColor,
  colors,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onSubmitEditing: () => void;
  placeholder: string;
  placeholderTextColor: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      keyboardType="number-pad"
      textContentType="telephoneNumber"
      autoComplete="tel"
      returnKeyType="done"
      maxLength={10}
      autoFocus
      style={[
        styles.phoneInput,
        { color: colors.foreground },
      ]}
    />
  );
}

/* =================================== STYLES ================================== */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },

  /* ---- Hero banner ---- */
  heroBanner: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  heroManImage: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.55,
    height: HERO_HEIGHT * 0.75,
  },
  heroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    /* A LinearGradient would be ideal, but to keep dependencies minimal
       we use a semi-transparent white overlay that blends the edge. */
    backgroundColor: 'rgba(248,246,241,0.55)',
  },

  /* ---- Form card ---- */
  formCard: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    justifyContent: 'space-between',
  },

  /* ---- Heading ---- */
  heading: {
    fontFamily: fonts.bodySemi,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: '#1A1A2E',
    marginBottom: 20,
  },

  /* ---- Phone row ---- */
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 52,
    borderRadius: radii.xl,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  flag: {
    fontSize: 20,
  },
  phoneField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  phonePrefix: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: '#1A1A2E',
  },
  phoneSeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#E2DDD4',
    marginHorizontal: 10,
  },
  phoneInputWrap: {
    flex: 1,
  },
  phoneInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingVertical: 0,
    height: 52,
  },

  /* ---- Error text ---- */
  errorText: {
    marginTop: 6,
    marginBottom: 4,
    marginLeft: 4,
  },

  /* ---- Continue button ---- */
  continueBtn: {
    height: 54,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  continueBtnLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    letterSpacing: 0.2,
  },

  /* ---- Divider ---- */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    marginHorizontal: 14,
  },

  /* ---- Google button ---- */
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: radii.xl,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  googleLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
  },

  /* ---- OTP step ---- */
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  backLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  otpSub: {
    marginBottom: 20,
    lineHeight: 21,
  },
  otpSection: {
    marginBottom: 4,
  },
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
    alignItems: 'center',
    marginTop: 16,
  },
  resendLink: {
    textDecorationLine: 'underline',
  },

  /* ---- Footer ---- */
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: spacing.xl,
    paddingBottom: 8,
  },
  footerText: {
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  footerLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: '#5C6A8A',
    textDecorationLine: 'underline',
  },
  footerLinkSep: {
    fontSize: 12,
  },
});
