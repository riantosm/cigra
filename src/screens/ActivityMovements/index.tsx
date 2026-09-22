import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import PressableScale from '@/components/atoms/PressableScale';
import MainLayout from '@/components/templates/MainLayout';
import ActivityRow from '@/screens/Home/ActivityRow';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getActivityMovementsApi } from '@/services/api/activity.service';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { ActivityMovement, PaginationMeta } from '@/types';
import { cleanValue, extractErrorMessage, formatRelativeTime, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.activityMovements>;

const PER_PAGE = 20;

// Chip ikon gradient arah pergerakan — samakan dengan CommanderHome "Aktivitas Terbaru".
const DIRECTION_GRADIENT: Record<'in' | 'out', readonly [string, string]> = {
  in: [colors.gradientSuccessStart, colors.success],
  out: [colors.gradientWarnStart, colors.warning],
};

function movementDetail(item: ActivityMovement): string {
  const head = cleanValue(item.note) ?? (item.direction === 'out' ? 'Keluar Markas' : 'Masuk Markas');
  return joinFields(head, item.purpose, item.location_label);
}

function personnelName(item: ActivityMovement): string {
  return joinFields(item.personnel.rank, item.personnel.full_name) || item.personnel.full_name;
}

export default function ActivityMovementsScreen(props: Props) {
  const { navigation } = props;

  const [items, setItems] = useState<ActivityMovement[]>([]);
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
      const result = await getActivityMovementsApi({ page: targetPage, per_page: PER_PAGE });
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

  const canLoadMore = meta
    ? meta.current_page < meta.last_page
    : items.length > 0 && items.length % PER_PAGE === 0;

  return (
    <MainLayout
      title="Aktivitas Terbaru"
      subtitle="Pergerakan keluar/masuk personel satuan"
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
              <PressableScale
                scaleTo={0.98}
                style={index < items.length - 1 ? styles.rowDivider : undefined}
                onPress={() =>
                  navigation.navigate(ROUTES.catalogDetail, {
                    resource: 'personnel',
                    id: item.personnel.service_number,
                    initialTab: 'visitor',
                  })
                }>
                <ActivityRow
                  name={personnelName(item)}
                  detail={movementDetail(item)}
                  time={formatRelativeTime(item.occurred_at) ?? '-'}
                  direction={item.direction === 'out' ? 'out' : 'in'}
                  gradientColors={DIRECTION_GRADIENT[item.direction === 'out' ? 'out' : 'in']}
                />
              </PressableScale>
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
    paddingBottom: 28,
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
