import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { spacing } from '@/constants/colors';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

export function LoadingView({ label }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
      {label ? (
        <Text variant="small" tone="muted" style={styles.gap}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: React.ComponentProps<typeof Feather>['name'];
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={22} color={colors.mutedForeground} />
      </View>
      <Text variant="section" style={styles.gap}>
        {title}
      </Text>
      {body ? (
        <Text variant="body" tone="muted" style={styles.body}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          size="md"
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );
}

export function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="alert-triangle"
      title="Something went wrong"
      body={message}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  gap: { marginTop: 4, textAlign: 'center' },
  body: { marginTop: 6, textAlign: 'center', maxWidth: 300 },
});
