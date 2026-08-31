import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import Card from '@/components/molecules/Card';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import FilterSheet from '@/components/organisms/FilterSheet';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { isDisplayablePhoto } from '@/utils/avatar';
import type { CatalogListItem } from '@/utils/catalogResources';
import { catalogResourceConfigs } from '@/utils/catalogResources';
import { extractErrorMessage } from '@/utils/format';

// Personel yang "aktif" pakai avatar gradient biru + titik hijau; sisanya ungu + titik abu
// (DESIGN_SYSTEM.md §5.8). Diturunkan dari badge status yang sudah dihitung per-resource.
function isActiveItem(item: CatalogListItem): boolean {
  return item.badgeVariant === 'success' || item.badgeVariant === 'primary';
}

function ListAvatar({ item }: { item: CatalogListItem }) {
  const [failed, setFailed] = useState(false);
  const active = isActiveItem(item);

  if (!isDisplayablePhoto(item.photo) || failed) {
    return (
      <GradientAvatar
        label={item.title.charAt(0).toUpperCase()}
        gradientStart={active ? colors.gradientPrimaryStart : colors.gradientInactiveStart}
        gradientEnd={active ? colors.gradientPrimaryEnd : colors.gradientInactiveEnd}
        dotColor={active ? colors.success : colors.placeholder}
      />
    );
  }

  return <SecureImage path={item.photo} style={styles.avatar} onLoadError={() => setFailed(true)} />;
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
    <MainLayout
      title={config.screenTitle}
      subtitle={config.menuSubtitle}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={styles.container}>
        <SearchFilterBar
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={() => setSearch(searchInput.trim())}
          placeholder={config.searchPlaceholder}
          onClear={handleClearSearch}
          onFilterPress={config.filterFields?.length ? () => setIsFilterSheetVisible(true) : undefined}
          activeFilterCount={activeFilterCount}
          style={styles.searchRow}
        />

        {isLoading ? (
          <ActivityIndicator style={styles.centerState} color={colors.primary} />
        ) : errorMessage ? (
          <Text style={styles.centerState}>{errorMessage}</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={9}
            removeClippedSubviews
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
            onEndReachedThreshold={0.4}
            onEndReached={handleEndReached}
            ListEmptyComponent={<Text style={styles.centerState}>Belum ada data.</Text>}
            ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.footerLoading} color={colors.primary} /> : undefined}
            renderItem={({ item }) => {
              const segments =
                item.metaSegments ??
                item.subtitle
                  .split(' · ')
                  .filter(Boolean)
                  .map(text => ({ icon: undefined, text }));
              return (
                <PressableScale
                  scaleTo={0.98}
                  onPress={() => navigation.navigate(ROUTES.catalogDetail, { resource, id: item.id })}>
                  <Card style={styles.row}>
                    {config.hasPhoto ? <ListAvatar item={item} /> : null}
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {segments.length ? (
                        <View style={styles.metaRow}>
                          {segments.map((segment, index) => (
                            <View key={segment.text + index} style={styles.metaSegment}>
                              {index > 0 ? <Text style={styles.metaDivider}>•</Text> : null}
                              {segment.icon ? (
                                <Icon name={segment.icon} size={13} color={colors.textMuted} />
                              ) : null}
                              <Text style={styles.metaText} numberOfLines={1}>
                                {segment.text}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                    {item.badgeLabel ? (
                      <Badge
                        label={item.badgeLabel}
                        variant={item.badgeVariant ?? 'neutral'}
                        style={styles.rowBadge}
                      />
                    ) : null}
                    <Icon name="chevron-right" size={18} color={colors.placeholder} />
                  </Card>
                </PressableScale>
              );
            }}
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
    paddingTop: 4,
  },
  searchRow: {
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 96,
    gap: 14,
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
    gap: 14,
  },
  avatar: {
    height: 52,
    width: 52,
    borderRadius: 26,
    backgroundColor: colors.neutralSurface,
  },
  rowText: {
    flex: 1,
    gap: 5,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.heading,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  metaSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDivider: {
    fontSize: 13,
    color: colors.dividerOnGradient,
    marginHorizontal: 2,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  // Badge default-nya `alignSelf: 'flex-start'` (konteks kolom) — di baris ini parent-nya row jadi
  // itu bikin nempel ke atas; paksa ke tengah vertikal.
  rowBadge: {
    alignSelf: 'center',
  },
});
