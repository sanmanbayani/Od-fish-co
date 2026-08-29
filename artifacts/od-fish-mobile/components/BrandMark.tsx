import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';

const LOGO = require('../assets/images/logo.png');

export function BrandMark({
  size = 40,
  showWordmark = true,
  tone = 'default',
  tagline = 'Elevating fresh seafish',
}: {
  size?: number;
  showWordmark?: boolean;
  tone?: 'default' | 'inverse';
  tagline?: string | null;
}) {
  const inverse = tone === 'inverse';
  return (
    <View style={styles.row}>
      <Image
        source={LOGO}
        style={{ width: size, height: size }}
        contentFit="contain"
        transition={150}
      />
      {showWordmark ? (
        <View style={styles.stack}>
          <Text
            variant="section"
            tone={inverse ? 'inverse' : 'default'}
            style={styles.word}
          >
            OD Fish Co.
          </Text>
          {tagline ? (
            <Text
              variant="tiny"
              uppercase
              numberOfLines={1}
              style={[
                styles.tag,
                inverse ? styles.tagInverse : undefined,
              ]}
              tone={inverse ? 'inverse' : 'muted'}
            >
              {tagline}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stack: { flexShrink: 1 },
  word: { fontSize: 18, lineHeight: 22 },
  tag: { letterSpacing: 1, marginTop: 1 },
  tagInverse: { opacity: 0.62 },
});
