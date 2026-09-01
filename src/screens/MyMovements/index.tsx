import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import MainLayout from '@/components/templates/MainLayout';
import TimelineRow from '@/screens/Home/MemberHome/TimelineRow';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getMyMovementsApi } from '@/services/api/me.service';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { MeMovement, PaginationMeta } from '@/types';
import { extractErrorMessage, formatRelativeTime, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.myMovements>;

const PER_PAGE = 20;

function movementTitle(item: MeMovement): string {
  if (item.note) return item.note;
  return item.direction === 'out' ? 'Keluar Markas' : 'Masuk Markas';
}

function clockLabel(iso: string | null | undefined): string {
  if (!iso) return '-';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function MyMovementsScreen(props: Props) {
  const { navigation } = props;

  const [items, setItems] = useState<MeMovement[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number, mode: 'initial' | 'refresh' | 'more') => {
    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);
    if (mode === 'more') setIsLoadingMore(true);
    setErrorMessage(null);
    try {
      const result = await getMyMovementsApi({ page: targetPage, per_page: PER_PAGE });
      setItems(previous =>
        targetPage <= 1
          ? result.items
          : [...previous, ...result.items.filter(i => !previous.some(p => p.id === i.id))],
      );
      setMeta(result.meta);
      setPage(result.meta?.current_page ?? targetPage);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat aktivitas.'));
      if (mode !== 'more') setItems([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(1, 'initial');
  }, [load]);

  // `meta` bisa null (backend tidak selalu kirim) — kalau begitu, "muat lebih banyak" ditentukan
  // dari apakah halaman terakhir mengembalikan PER_PAGE item penuh.
  const canLoadMore = meta
    ? meta.current_page < meta.last_page
    : items.length > 0 && items.length % PER_PAGE === 0;

  return (
    <MainLayout
      title="Aktivitas Terbaru"
      subtitle="Riwayat keluar/masuk markas"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <View style={styles.screenPad}>
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={items.length > 0 ? styles.listCard : styles.listEmpty}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => load(1, 'refresh')} tintColor={colors.primary} />
            }
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (canLoadMore && !isLoadingMore) load(page + 1, 'more');
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>{errorMessage ?? 'Belum ada aktivitas keluar/masuk.'}</Text>
            }
            ListFooterComponent={
              isLoadingMore ? <ActivityIndicator style={styles.footerLoader} color={colors.primary} /> : undefined
            }
            renderItem={({ item, index }) => (
              <View style={index < items.length - 1 ? styles.rowDivider : undefined}>
                <TimelineRow
                  direction={item.direction === 'out' ? 'out' : 'in'}
                  title={movementTitle(item)}
                  detail={joinFields(item.location_label, item.purpose) || '-'}
                  time={formatRelativeTime(item.occurred_at) ?? clockLabel(item.occurred_at)}
                />
              </View>
            )}
          />
        </View>
      )}
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  screenPad: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  loader: {
    marginTop: 48,
  },
  footerLoader: {
    marginVertical: 16,
  },
  listCard: {
    paddingHorizontal: 14,
    paddingBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  listEmpty: {
    paddingBottom: 96,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  empty: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
});
