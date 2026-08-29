import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetCurrentCustomer,
  useLogoutCustomer,
  useUpdateCurrentCustomer,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';
import { apiErrorMessage } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { BrandMark } from '@/components/BrandMark';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, LoadingView } from '@/components/ui/StateViews';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/ui/Screen';

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isReady, isSignedIn, customer, signOut, setCustomer } = useAuth();

  const profile = useGetCurrentCustomer({
    query: { queryKey: ['me'], enabled: isSignedIn },
  });
  const updateProfile = useUpdateCurrentCustomer();
  const logout = useLogoutCustomer();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const me = profile.data ?? customer;

  const startEdit = () => {
    setFullName(me?.fullName ?? '');
    setEmail(me?.email ?? '');
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    setError(null);
    if (!fullName.trim()) {
      setError('Tell us what to call you.');
      return;
    }
    try {
      const updated = await updateProfile.mutateAsync({
        data: {
          fullName: fullName.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
        },
      });
      await setCustomer(updated);
      await profile.refetch();
      setEditing(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save your details.'));
    }
  };

  const confirmSignOut = () => {
    const doSignOut = async () => {
      try {
        await logout.mutateAsync();
      } catch {
        // The local session is what matters; a failed server call is not fatal.
      }
      await signOut();
      router.replace('/(tabs)');
    };

    if (Platform.OS === 'web') {
      doSignOut();
      return;
    }
    Alert.alert('Sign out?', 'You will need your OTP to sign back in.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: doSignOut },
    ]);
  };

  if (!isReady) {
    return (
      <Screen top>
        <LoadingView />
      </Screen>
    );
  }

  if (!isSignedIn) {
    return (
      <Screen top>
        <View style={[styles.head, { paddingTop: spacing.md }]}>
          <BrandMark size={40} />
        </View>
        <EmptyState
          icon="user"
          title="Sign in to OD Fish Co."
          body="Save addresses, track deliveries and reorder your regulars in one tap."
          actionLabel="Sign in with OTP"
          onAction={() => router.push('/login')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={96}
      >
        <Text variant="title">Account</Text>

        {profile.isError ? (
          <Text variant="small" tone="danger" style={styles.loadWarning}>
            {apiErrorMessage(
              profile.error,
              'Could not refresh your details just now — showing what we last saved.',
            )}
          </Text>
        ) : null}

        <Card style={styles.card}>
          {editing ? (
            <View style={styles.form}>
              <TextField
                label="Full name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
              />
              <TextField
                label="Email (optional)"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={save}
                error={error}
              />
              <View style={styles.formRow}>
                <Button
                  label="Cancel"
                  variant="outline"
                  onPress={() => setEditing(false)}
                  style={styles.flex}
                />
                <Button
                  label="Save"
                  onPress={save}
                  loading={updateProfile.isPending}
                  style={styles.flex}
                />
              </View>
            </View>
          ) : (
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text variant="section" tone="inverse">
                  {(me?.fullName ?? 'OD').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text variant="cardTitle">{me?.fullName ?? 'Add your name'}</Text>
                <Text variant="small" tone="muted" style={styles.gap}>
                  +91 {me?.phone}
                </Text>
                {me?.email ? (
                  <Text variant="small" tone="muted">
                    {me.email}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={startEdit} hitSlop={10}>
                <Feather name="edit-2" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}
        </Card>

        <Card style={styles.card} padded={false}>
          <Row
            icon="map-pin"
            label="Delivery addresses"
            caption="Where we drop the ice box"
            onPress={() => router.push('/addresses')}
          />
          <Divider />
          <Row
            icon="shopping-bag"
            label="Your orders"
            caption="Track and reorder"
            onPress={() => router.push('/(tabs)/orders')}
          />
          <Divider />
          <Row
            icon="clock"
            label="Delivery slots"
            caption="Morning and evening runs across Mumbai"
            onPress={() => router.push('/(tabs)/shop')}
          />
        </Card>

        <Card style={styles.card} tone="accent">
          <Text variant="section">Need a hand?</Text>
          <Text variant="small" tone="muted" style={styles.help}>
            Call the counter on 022-4890-1100, 7am to 9pm. For anything about a
            live order, keep your order number handy.
          </Text>
        </Card>

        <Button
          label="Sign out"
          variant="outline"
          onPress={confirmSignOut}
          loading={logout.isPending}
          fullWidth
          style={styles.signOut}
        />

        <Text variant="tiny" tone="muted" style={styles.version}>
          OD Fish Co. · Elevating fresh seafish, every day
        </Text>
      </KeyboardAwareScrollViewCompat>
    </Screen>
  );
}

function Row({
  icon,
  label,
  caption,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  caption: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={15} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyMedium">{label}</Text>
        <Text variant="tiny" tone="muted" style={styles.gap}>
          {caption}
        </Text>
      </View>
      <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.lg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: TAB_BAR_CLEARANCE + 20,
  },
  card: { marginTop: spacing.lg },
  loadWarning: { marginTop: 8 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  gap: { marginTop: 2 },
  form: { gap: spacing.md },
  formRow: { flexDirection: 'row', gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  help: { marginTop: 6, lineHeight: 19 },
  signOut: { marginTop: spacing.xl },
  version: { textAlign: 'center', marginTop: spacing.lg },
});
