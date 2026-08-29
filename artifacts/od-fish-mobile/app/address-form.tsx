import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCheckServiceability,
  useCreateAddress,
  useListAddresses,
  useUpdateAddress,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';
import { apiErrorMessage } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { KeyboardStickyFooter } from '@/components/KeyboardStickyFooter';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { Screen } from '@/components/ui/Screen';

const LABELS = ['Home', 'Work', 'Other'];

export default function AddressFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { customer, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const addresses = useListAddresses({
    query: { queryKey: ['addresses'], enabled: isSignedIn },
  });
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();

  const [label, setLabel] = useState('Home');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [area, setArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Live serviceability feedback the moment a full pincode is typed, so the
  // customer never fills a whole form for an address we cannot reach.
  const serviceability = useCheckServiceability(pincode, {
    query: {
      queryKey: ['serviceability', pincode],
      enabled: pincode.length === 6,
    },
  });

  useEffect(() => {
    if (hydrated) return;
    if (!isEdit) {
      setReceiverName(customer?.fullName ?? '');
      setReceiverPhone(customer?.phone ?? '');
      setHydrated(true);
      return;
    }
    const existing = addresses.data?.find((a) => a.id === id);
    if (!existing) return;
    setLabel(existing.label);
    setReceiverName(existing.receiverName);
    setReceiverPhone(existing.receiverPhone);
    setLine1(existing.line1);
    setLine2(existing.line2 ?? '');
    setArea(existing.area);
    setPincode(existing.pincode);
    setIsDefault(existing.isDefault);
    setHydrated(true);
  }, [hydrated, isEdit, id, addresses.data, customer]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!receiverName.trim()) next.receiverName = 'Who should we hand it to?';
    if (!/^[6-9]\d{9}$/.test(receiverPhone))
      next.receiverPhone = 'Enter a valid 10-digit number.';
    if (!line1.trim()) next.line1 = 'Flat, building and street, please.';
    if (!area.trim()) next.area = 'Which area is this?';
    if (!/^\d{6}$/.test(pincode)) next.pincode = 'Enter a 6-digit pincode.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    setFormError(null);
    if (!validate()) return;
    const payload = {
      label,
      receiverName: receiverName.trim(),
      receiverPhone,
      line1: line1.trim(),
      ...(line2.trim() ? { line2: line2.trim() } : {}),
      area: area.trim(),
      pincode,
      isDefault,
    };
    try {
      if (isEdit && id) {
        await updateAddress.mutateAsync({ id, data: payload });
      } else {
        await createAddress.mutateAsync({ data: payload });
      }
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      if (router.canGoBack()) router.back();
      else router.replace('/addresses');
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save this address.'));
    }
  };

  const pinResult = pincode.length === 6 ? serviceability.data : undefined;
  const missingForEdit =
    isEdit && addresses.isSuccess && !addresses.data?.find((a) => a.id === id);

  if (isEdit && !hydrated && addresses.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Edit address' }} />
        <LoadingView />
      </Screen>
    );
  }

  // Rendering an empty form here would invite the customer to retype an
  // address from scratch and save the gaps over the one we already hold.
  if (isEdit && !hydrated && addresses.isError) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Edit address' }} />
        <ErrorView
          message={apiErrorMessage(addresses.error, 'Could not load this address.')}
          onRetry={() => addresses.refetch()}
        />
      </Screen>
    );
  }

  // The address is genuinely gone — removed on another device, or a stale deep
  // link. Retrying would loop for ever, so offer the way out instead.
  if (isEdit && !hydrated && missingForEdit) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Edit address' }} />
        <EmptyState
          icon="map-pin"
          title="That address is gone"
          body="It looks like it was removed. Your other saved addresses are still here."
          actionLabel="Back to addresses"
          onAction={() => router.replace('/addresses')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        options={{ title: isEdit ? 'Edit address' : 'New address' }}
      />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={96}
      >
        <View>
          <Text variant="label" tone="muted" uppercase style={styles.groupLabel}>
            Save as
          </Text>
          <View style={styles.chips}>
            {LABELS.map((option) => {
              const active = option === label;
              return (
                <Pressable
                  key={option}
                  onPress={() => setLabel(option)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    variant="smallMedium"
                    style={{
                      color: active ? colors.primaryForeground : colors.foreground,
                    }}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField
          label="Pincode"
          placeholder="400050"
          keyboardType="number-pad"
          maxLength={6}
          value={pincode}
          onChangeText={(t) => setPincode(t.replace(/\D/g, ''))}
          error={errors.pincode}
          hint={
            serviceability.isError && pincode.length === 6
              ? 'Could not check this pincode right now — you can still save the address.'
              : pinResult
              ? pinResult.serviceable
                ? `We deliver to ${pinResult.areaName ?? pinResult.pincode}.`
                : 'Not on our route yet — you can still save it for later.'
              : undefined
          }
        />

        <TextField
          label="Flat, building, street"
          placeholder="B-1204, Sagar Residency, Hill Road"
          value={line1}
          onChangeText={setLine1}
          error={errors.line1}
        />

        <TextField
          label="Landmark (optional)"
          placeholder="Opposite the fish market"
          value={line2}
          onChangeText={setLine2}
        />

        <TextField
          label="Area"
          placeholder="Bandra West"
          value={area}
          onChangeText={setArea}
          error={errors.area}
        />

        <TextField
          label="Receiver's name"
          placeholder="Who will take the delivery?"
          value={receiverName}
          onChangeText={setReceiverName}
          autoCapitalize="words"
          error={errors.receiverName}
        />

        <TextField
          label="Receiver's mobile"
          prefix="+91"
          placeholder="98XXXXXXXX"
          keyboardType="number-pad"
          maxLength={10}
          value={receiverPhone}
          onChangeText={(t) => setReceiverPhone(t.replace(/\D/g, ''))}
          error={errors.receiverPhone}
        />

        <Pressable
          onPress={() => setIsDefault((v) => !v)}
          style={styles.checkboxRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: isDefault ? colors.primary : colors.border,
                backgroundColor: isDefault ? colors.primary : 'transparent',
                borderRadius: radii.sm,
              },
            ]}
          >
            {isDefault ? (
              <Feather name="check" size={12} color={colors.primaryForeground} />
            ) : null}
          </View>
          <Text variant="body">Make this my default address</Text>
        </Pressable>

        {formError ? (
          <Text variant="small" tone="danger">
            {formError}
          </Text>
        ) : null}
      </KeyboardAwareScrollViewCompat>

      <KeyboardStickyFooter
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
          label={isEdit ? 'Save changes' : 'Save address'}
          size="lg"
          fullWidth
          loading={createAddress.isPending || updateAddress.isPending}
          onPress={save}
        />
      </KeyboardStickyFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 120, gap: spacing.lg },
  groupLabel: { marginBottom: 8 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 18,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
