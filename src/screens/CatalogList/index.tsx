import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import Card from '@/components/molecules/Card';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import type { CatalogListItem } from '@/utils/catalogResources';
import { catalogResourceConfigs } from '@/utils/catalogResources';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<'CatalogList'>;

export default function CatalogListScreen(props: Props) {
  const { navigation, route } = props;
  const { resource } = route.params;
  const config = catalogResourceConfigs[resource];

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<CatalogListItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPage = useCallback(
    async (targetPage: number, mode: 'initial' | 'refresh' | 'more') => {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      if (mode === 'more') setIsLoadingMore(true);
      setErrorMessage(null);
      try {
        const result = await config.fetchList({ search: search || undefined, page: targetPage });
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
    [config, search],
  );

  useEffect(() => {
    loadPage(1, 'initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function handleSearchSubmit() {
    setSearch(searchInput.trim());
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
        <TextField
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={handleSearchSubmit}
          placeholder={config.searchPlaceholder}
          returnKeyType="search"
          containerStyle={styles.search}
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
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  search: {
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 96,
    gap: 12,
  },
  centerState: {
    marginTop: 32,
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
