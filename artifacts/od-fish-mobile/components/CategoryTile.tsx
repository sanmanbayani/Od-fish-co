import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { Category } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { mediaUrl } from '@/lib/api';
import { CATEGORY_PREVIEWS } from '@/constants/studioPreviews';
import { Text } from '@/components/ui/Text';

export function CategoryTile({
  category,
  onPress,
  width = 84,
}: {
  category: Category;
  onPress: () => void;
  width?: number;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width, alignItems: 'center', opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={CATEGORY_PREVIEWS[category.slug] ?? mediaUrl(category.imageUrl)}
          style={styles.image}
          contentFit="contain"
          transition={180}
        />
      </View>
      <Text
        variant="smallMedium"
        numberOfLines={1}
        style={[styles.name, { color: colors.foreground }]}
      >
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    marginTop: 4,
    textAlign: 'center',
  },
  local: {
    textAlign: 'center',
    marginTop: 1,
  },
});
