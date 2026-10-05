import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListCategories, useListProducts } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { CATALOGUE_POLL_MS } from '@/constants/query';
import { CartBar } from '@/components/CartBar';
import { ProductRow } from '@/components/ProductRow';
import { Text } from '@/components/ui/Text';
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/StateViews';
import { Screen, TAB_BAR_CLEARANCE } from '@/components/ui/Screen';

/** Search-bar colors — kept in sync with the home screen hero search bar. */
const SEARCH_BG = '#FFFFFF';
const SEARCH_BORDER = 'rgba(0,0,0,0.06)';

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; autofocus?: string }>();
  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef<TextInput>(null);
  const lastHandledAutofocus = useRef<string | null>(null);

  // Sync category if navigated with a specific category param
  React.useEffect(() => {
    if (params.category !== undefined) {
      setCategory(params.category ?? null);
    }
  }, [params.category]);

  // Auto-focus search input only when navigated explicitly from the search button
  useFocusEffect(
    React.useCallback(() => {
      const autofocusToken = params.autofocus;
      if (autofocusToken && autofocusToken !== lastHandledAutofocus.current) {
        lastHandledAutofocus.current = autofocusToken;

        // Give the screen transition time to settle before opening soft keyboard on Android
        const t1 = setTimeout(() => inputRef.current?.focus(), 150);
        const t2 = setTimeout(() => {
          inputRef.current?.focus();
          // Clear param after focus completes so tab bar navigation stays natural
          router.setParams({ autofocus: '' });
        }, 350);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    }, [params.autofocus, router])
  );

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
    query: {
      queryKey: ['products', category, debounced],
      refetchInterval: CATALOGUE_POLL_MS,
    },
  });

  const chips = [
    { slug: null as string | null, name: 'Everything' },
    ...(categories.data ?? []).map((c) => ({ slug: c.slug, name: c.name })),
  ];

  return (
    <Screen>
      <View style={[styles.head, { paddingTop: insets.top + spacing.md }]}>
        <Text variant="title">The counter</Text>

        {/* Search bar — visually identical to the home screen search bar */}
        <Pressable
          style={styles.searchBar}
          onPress={() => inputRef.current?.focus()}
        >
          <Feather name="search" size={18} color="#9CA3AF" />
          <TextInput
            ref={inputRef}
            placeholder="Search for.."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Feather name="x" size={16} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </Pressable>

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
              ? `No fish called "${debounced}" on the counter today.`
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
          refreshControl={
            <RefreshControl
              refreshing={products.isRefetching}
              onRefresh={() => products.refetch()}
            />
          }
        />
      )}

      <CartBar offset={TAB_BAR_CLEARANCE - 46} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: radii.xl,
    backgroundColor: SEARCH_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SEARCH_BORDER,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#0B1A3D',
    padding: 0,
  },
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
