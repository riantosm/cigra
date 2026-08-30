import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import Card from '@/components/molecules/Card';
import FilterSheet from '@/components/organisms/FilterSheet';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { isDisplayablePhoto } from '@/utils/avatar';
import type { CatalogListItem } from '@/utils/catalogResources';
import { catalogResourceConfigs } from '@/utils/catalogResources';
import { extractErrorMessage } from '@/utils/format';

function ListAvatar({ item }: { item: CatalogListItem }) {
  const [failed, setFailed] = useState(false);

  if (!isDisplayablePhoto(item.avatarUrl) || failed) {
    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarFallbackLabel}>{item.title.charAt(0).toUpperCase()}</Text>
      </View>
    );
  }

  return <Image source={{ uri: item.avatarUrl }} style={styles.avatar} onError={() => setFailed(true)} />;
}

const SEARCH_DEBOUNCE_MS = 1000;

type Props = RootStackScreenProps<'CatalogList'>;

export default function CatalogListScreen(props: Props) {
  const { navigation, route } = props;
  const { resource } = route.params;
  const config = catalogResourceConfigs[resource];

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [items, setItems] = useState<CatalogListItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeFilterCount = Object.keys(filters).length;

  const loadPage = useCallback(
    async (targetPage: number, mode: 'initial' | 'refresh' | 'more') => {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      if (mode === 'more') setIsLoadingMore(true);
      setErrorMessage(null);
      try {
        const result = await config.fetchList({ search: search || undefined, page: targetPage, ...filters });
        const mapped = result.items.map(config.toListItem);
        setItems(previous => (mode === 'more' ? [...previous, ...mapped] : mapped));
        setPage(result.meta.current_page);
        setLastPage(result.meta.last_page);
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat data.'));
        if (mode !== 'more') setItems([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [config, search, filters],
  );

  useEffect(() => {
    loadPage(1, 'initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === search) return;
    // Tampilkan loading dari saat mulai mengetik (bukan cuma pas request beneran jalan)
    // supaya user langsung dapat feedback, bukan menunggu 1 detik tanpa indikasi apa pun.
    setIsLoading(true);
    const timer = setTimeout(() => setSearch(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  function handleClearSearch() {
    setSearchInput('');
    setSearch('');
  }

  function handleRefresh() {
    loadPage(1, 'refresh');
  }

  function handleEndReached() {
    if (isLoading || isLoadingMore || isRefreshing) return;
    if (page >= lastPage) return;
    loadPage(page + 1, 'more');
  }

  return (
    <MainLayout title={config.screenTitle} onBack={() => navigation.goBack()}>
      <View style={styles.container}>
        <View style={styles.searchRow}>
          <TextField
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={() => setSearch(searchInput.trim())}
            placeholder={config.searchPlaceholder}
            returnKeyType="search"
            leftIcon="search"
            onClear={handleClearSearch}
            containerStyle={styles.searchField}
            style={styles.searchInput}
          />
          {config.filterFields?.length ? (
            <PressableScale
              onPress={() => setIsFilterSheetVisible(true)}
              contentStyle={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
              accessibilityRole="button"
              accessibilityLabel="Filter">
              <Icon name="filter" size={20} color={activeFilterCount > 0 ? colors.primary : colors.textMuted} />
              {activeFilterCount > 0 ? (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeLabel}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </PressableScale>
          ) : null}
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.centerState} color={colors.primary} />
        ) : errorMessage ? (
          <Text style={styles.centerState}>{errorMessage}</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
            onEndReachedThreshold={0.4}
            onEndReached={handleEndReached}
            ListEmptyComponent={<Text style={styles.centerState}>Belum ada data.</Text>}
            ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.footerLoading} color={colors.primary} /> : undefined}
            renderItem={({ item }) => (
              <PressableScale
                scaleTo={0.98}
                onPress={() => navigation.navigate(ROUTES.catalogDetail, { resource, id: item.id })}>
                <Card style={styles.row}>
                  {item.avatarUrl ? <ListAvatar item={item} /> : null}
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.badgeLabel ? <Badge label={item.badgeLabel} variant={item.badgeVariant ?? 'neutral'} /> : null}
                </Card>
              </PressableScale>
            )}
          />
        )}
      </View>

      {config.filterFields?.length ? (
        <FilterSheet
          visible={isFilterSheetVisible}
          fields={config.filterFields}
          value={filters}
          onApply={setFilters}
          onRequestClose={() => setIsFilterSheetVisible(false)}
        />
      ) : null}
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchField: {
    flex: 1,
  },
  searchInput: {
    height: 52,
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  filterBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 96,
    gap: 12,
  },
  centerState: {
    marginTop: 32,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
  footerLoading: {
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: colors.neutralSurface,
  },
  avatarFallback: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarFallbackLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
