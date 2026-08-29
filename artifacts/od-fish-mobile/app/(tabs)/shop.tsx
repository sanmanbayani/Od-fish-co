import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListCategories, useListProducts } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';
import { CartBar } from '@/components/CartBar';
import { ProductRow } from '@/components/ProductRow';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/ui/Screen';

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const categories = useListCategories({ query: { queryKey: ['categories'] } });
  const query = useMemo(
    () => ({
      ...(category ? { category } : {}),
      ...(debounced ? { search: debounced } : {}),
    }),
    [category, debounced],
  );
  const products = useListProducts(query, {
    query: { queryKey: ['products', category, debounced] },
  });

  const chips = [
    { slug: null as string | null, name: 'Everything' },
    ...(categories.data ?? []).map((c) => ({ slug: c.slug, name: c.name })),
  ];

  return (
    <Screen>
      <View style={[styles.head, { paddingTop: insets.top + spacing.md }]}>
        <Text variant="title">The counter</Text>
        <TextField
          placeholder="Search pomfret, prawns, bombil…"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
          containerStyle={styles.search}
          prefix=""
          // Feather search glyph rendered via prefix slot is not supported,
          // so the placeholder carries the affordance.
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {chips.map((chip) => {
            const active = chip.slug === category;
            return (
              <Pressable
                key={chip.slug ?? 'all'}
                onPress={() => setCategory(chip.slug)}
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
                  {chip.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {products.isLoading ? (
        <LoadingView />
      ) : products.isError ? (
        <ErrorView
          message="Could not load the catalogue."
          onRetry={() => products.refetch()}
        />
      ) : (products.data ?? []).length === 0 ? (
        <EmptyState
          icon="search"
          title="Nothing matches"
          body={
            debounced
              ? `No fish called “${debounced}” on the counter today.`
              : 'This section is empty right now.'
          }
        />
      ) : (
        <FlatList
          data={products.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProductRow product={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        />
      )}

      <CartBar offset={TAB_BAR_CLEARANCE - 46} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  search: { marginTop: spacing.md },
  chips: { gap: 8, paddingTop: spacing.md, paddingRight: spacing.lg },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: TAB_BAR_CLEARANCE + 60,
    paddingTop: 4,
  },
  sep: { height: 10 },
});
