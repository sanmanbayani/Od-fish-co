import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { spacing } from '@/constants/colors';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Screen top bottom style={styles.container}>
        <Text variant="section">This screen doesn&apos;t exist.</Text>
        <Link href="/" style={styles.link}>
          <Text variant="smallMedium" tone="primary">
            Back to the counter
          </Text>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  link: { marginTop: spacing.md, paddingVertical: spacing.md },
});
