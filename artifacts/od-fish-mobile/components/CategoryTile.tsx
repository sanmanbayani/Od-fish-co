import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { Category } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii } from '@/constants/colors';
import { mediaUrl } from '@/lib/api';
import { Text } from '@/components/ui/Text';

export function CategoryTile({
  category,
  onPress,
  width = 92,
}: {
  category: Category;
  onPress: () => void;
  width?: number;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}
    >
      <View
        style={[
          styles.imageWrap,
          {
            backgroundColor: colors.accent,
            borderColor: colors.border,
            borderRadius: radii.xl,
          },
        ]}
      >
        <Image
          source={mediaUrl(category.imageUrl)}
          style={styles.image}
          contentFit="cover"
          transition={180}
        />
      </View>
      <Text variant="smallMedium" numberOfLines={1} style={styles.name}>
        {category.name}
      </Text>
      {category.nameLocal ? (
        <Text variant="tiny" tone="muted" numberOfLines={1} style={styles.local}>
          {category.nameLocal}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  name: { marginTop: 7, textAlign: 'center' },
  local: { textAlign: 'center', marginTop: 1 },
});
