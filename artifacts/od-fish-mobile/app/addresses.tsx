import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import type { Address } from '@workspace/api-client-react';
import {
  useDeleteAddress,
  useListAddresses,
  useUpdateAddress,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';
import { apiErrorMessage } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { Screen } from '@/components/ui/Screen';

export default function AddressesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const addresses = useListAddresses({
    query: { queryKey: ['addresses'], enabled: isSignedIn },
  });
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['addresses'] });

  const makeDefault = async (address: Address) => {
    setError(null);
    try {
      await updateAddress.mutateAsync({ id: address.id, data: { isDefault: true } });
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update that address.'));
    }
  };

  const remove = (address: Address) => {
    const run = async () => {
      setError(null);
      try {
        await deleteAddress.mutateAsync({ id: address.id });
        await refresh();
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not remove that address.'));
      }
    };
    if (Platform.OS === 'web') {
      run();
      return;
    }
    Alert.alert('Remove this address?', address.line1, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: run },
    ]);
  };

  if (!isSignedIn) {
    return (
      <Screen>
        <EmptyState
          icon="map-pin"
          title="Sign in first"
          body="Saved addresses live with your account."
          actionLabel="Sign in"
          onAction={() => router.push('/login')}
        />
      </Screen>
    );
  }

  if (addresses.isLoading) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }

  if (addresses.isError) {
    return (
      <Screen>
        <ErrorView
          message="Could not load your addresses."
          onRetry={() => addresses.refetch()}
        />
      </Screen>
    );
  }

  const list = addresses.data ?? [];

  return (
    <Screen>
      {list.length === 0 ? (
        <EmptyState
          icon="map-pin"
          title="No addresses saved"
          body="Add the place we should bring your ice box."
          actionLabel="Add an address"
          onAction={() => router.push('/address-form')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <Text variant="small" tone="danger">
              {error}
            </Text>
          ) : null}
          {list.map((address) => (
            <Card key={address.id}>
              <View style={styles.head}>
                <View style={styles.labelRow}>
                  <Feather name="map-pin" size={14} color={colors.primary} />
                  <Text variant="cardTitle">{address.label}</Text>
                  {address.isDefault ? <Badge label="Default" tone="navy" /> : null}
                  {!address.isServiceable ? (
                    <Badge label="Out of range" tone="danger" />
                  ) : null}
                </View>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/address-form', params: { id: address.id } })
                  }
                  hitSlop={10}
                >
                  <Feather name="edit-2" size={15} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <Text variant="small" tone="muted" style={styles.body}>
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}
                {'\n'}
                {address.area}, {address.city} {address.pincode}
              </Text>
              <Text variant="tiny" tone="muted" style={styles.receiver}>
                {address.receiverName} · +91 {address.receiverPhone}
              </Text>

              <View style={[styles.actions, { borderTopColor: colors.border }]}>
                {!address.isDefault ? (
                  <Pressable onPress={() => makeDefault(address)} hitSlop={6}>
                    <Text variant="smallMedium" tone="primary">
                      Set as default
                    </Text>
                  </Pressable>
                ) : (
                  <View />
                )}
                <Pressable onPress={() => remove(address)} hitSlop={6}>
                  <Text variant="smallMedium" tone="danger">
                    Remove
                  </Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      {list.length > 0 ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          <Button
            label="Add another address"
            variant="outline"
            fullWidth
            onPress={() => router.push('/address-form')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  body: { marginTop: 10, lineHeight: 19 },
  receiver: { marginTop: 6 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderRadius: radii.sm,
  },
});
