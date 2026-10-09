import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { overlay, radii, spacing } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { API_BASE_URL, setCurrentToken } from '@/lib/api';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { BrandMark } from '@/components/BrandMark';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { OtpInput } from '@/components/ui/OtpInput';
import { Screen } from '@/components/ui/Screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Phone linking screen — shown after Google sign-in when the customer
 * does not have a phone number on their account yet. The phone is needed
 * for delivery coordination (the rider calls the receiver).
 */
export default function LinkPhoneScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { customer, setCustomer } = useAuth();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [mockAuth, setMockAuth] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const getToken = async () => {
    return await AsyncStorage.getItem('odfish.session.token');
  };

  const onSendOtp = async () => {
    setError(null);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/auth/link-phone/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { message?: string }).message ?? 'Could not send OTP.');
        return;
      }

      const data = await res.json();
      setDevOtp(data.devOtp ?? null);
      setMockAuth(Boolean(data.mockAuth));
      setStep('otp');
      startCountdown(data.expiresInSeconds || 300);
    } catch {
      setError('Could not send the OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (code = otp) => {
    setError(null);
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/auth/link-phone/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone, otp: code }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { message?: string }).message ?? 'Verification failed.');
        setOtp('');
        return;
      }

      const updatedCustomer = await res.json();
      await setCustomer(updatedCustomer);

      // Phone is now linked — go to the main app.
      router.replace('/(tabs)');
    } catch {
      setError('Verification failed. Try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    // Let them browse without a phone, but they'll be asked again at checkout.
    router.replace('/(tabs)');
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
          {/* `inverse`: this screen uses the deep navy band, and the default
              tone paints the glyph navy — invisible against it. */}
          <BrandMark size={38} showWordmark={false} tone="inverse" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip"
            onPress={skip}
            hitSlop={12}
            style={[styles.close, { borderColor: overlay.hairline }]}
          >
            <Text variant="small" tone="inverse">Skip</Text>
          </Pressable>
        </View>

        <Text variant="hero" tone="inverse" style={styles.headline}>
          {step === 'phone' ? 'Add your mobile\nnumber' : 'Enter the code'}
        </Text>
        <Text style={[styles.sub, { color: overlay.mutedForeground }]} variant="body">
          {step === 'phone'
            ? 'Your rider will call this number for delivery coordination. You can also use it to sign in next time.'
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
                loading={loading}
                size="lg"
                fullWidth
                style={styles.action}
              />
            </>
          ) : (
            <>
              <Text variant="label" tone="muted" uppercase style={styles.otpLabel}>
                6-digit OTP
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
                <View
                  style={[
                    styles.devHint,
                    { backgroundColor: colors.accent, borderRadius: radii.md },
                  ]}
                >
                  <Feather name="info" size={13} color={colors.mutedForeground} />
                  <Text variant="small" tone="muted" style={styles.flex}>
                    Dev code:{' '}
                    <Text variant="smallMedium" tone="primary">
                      {devOtp}
                    </Text>
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
                    Enter the shared demo code.
                  </Text>
                </View>
              ) : null}
              <Button
                label="Verify & link"
                onPress={() => onVerify()}
                loading={loading}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: { marginTop: spacing.xxl },
  sub: { marginTop: spacing.sm, maxWidth: 320 },
  sheet: { marginTop: spacing.xl, padding: spacing.lg },
  action: { marginTop: spacing.lg },
  otpLabel: { marginBottom: 10 },
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
});
