import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, RefreshControl } from 'react-native';

import Badge from '@/components/atoms/Badge';
import type { BadgeVariant } from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import Card from '@/components/molecules/Card';
import FilterSheet from '@/components/organisms/FilterSheet';
import type { FilterField } from '@/components/organisms/FilterSheet';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getPanicButtonsApi } from '@/services/api/panicButton.service';
import { colors } from '@/theme/colors';
import type { PanicButtonListItem, PanicButtonStatus } from '@/types';
import { isDisplayablePhoto } from '@/utils/avatar';
import { extractErrorMessage, formatDateTime, formatRelativeTime, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.emergencyList>;

export const emergencyStatusLabel: Record<string, string> = {
  active: 'Aktif',
  acknowledged: 'Ditangani',
  resolved: 'Selesai',
};

export const emergencyStatusBadgeVariant: Record<string, BadgeVariant> = {
  active: 'danger',
  acknowledged: 'warning',
  resolved: 'success',
};

const statusAvatarGradient: Record<string, [string, string]> = {
  active: [colors.gradientDangerStart, colors.danger],
  acknowledged: [colors.gradientWarnStart, colors.warning],
  resolved: [colors.gradientSuccessStart, colors.success],
};

const STATUS_FILTER_FIELD: FilterField = {
  key: 'status',
  label: 'Status',
  options: [
    { label: emergencyStatusLabel.active, value: 'active' },
    { label: emergencyStatusLabel.acknowledged, value: 'acknowledged' },
    { label: emergencyStatusLabel.resolved, value: 'resolved' },
  ],
};

const PER_PAGE = 20;

function EmergencyAvatar({ item }: { item: PanicButtonListItem }) {
  const [failed, setFailed] = useState(false);
  const [start, end] = statusAvatarGradient[item.status] ?? statusAvatarGradient.resolved;
  if (!isDisplayablePhoto(item.personnel.photo) || failed) {
    return (
      <GradientAvatar
        label={item.personnel.full_name.charAt(0).toUpperCase()}
        gradientStart={start}
        gradientEnd={end}
        size={44}
      />
    );
  }
  return (
    <SecureImage path={item.personnel.photo} style={styles.avatar} onLoadError={() => setFailed(true)} />
  );
}

export default function EmergencyListScreen(props: Props) {
  const { navigation } = props;

  const [items, setItems] = useState<PanicButtonListItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const statusFilter = (filters.status as PanicButtonStatus | undefined) ?? undefined;

  const load = useCallback(
    async (targetPage: number, mode: 'initial' | 'refresh' | 'more') => {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      if (mode === 'more') setIsLoadingMore(true);
      setErrorMessage(null);
      try {
        const result = await getPanicButtonsApi({
          page: targetPage,
          per_page: PER_PAGE,
          status: statusFilter,
        });
        setItems(previous =>
          targetPage <= 1 ? result.items : [...previous, ...result.items.filter(i => !previous.some(p => p.id === i.id))],
        );
        setPage(result.meta?.current_page ?? targetPage);
        setLastPage(result.meta?.last_page ?? targetPage);
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat sinyal darurat.'));
        if (mode !== 'more') setItems([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    load(1, 'initial');
  }, [load]);

  const canLoadMore = page < lastPage;

  return (
    <MainLayout
      title="Sinyal Darurat"
      subtitle="Riwayat tombol darurat personel"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <PressableScale
        scaleTo={0.98}
        onPress={() => setIsFilterVisible(true)}
        contentStyle={styles.filterBar}
        style={styles.searchRow}>
        <Icon name="filter" size={16} color={colors.primary} />
        <Text style={styles.filterBarText}>
          {statusFilter ? `Status: ${emergencyStatusLabel[statusFilter]}` : 'Semua status'}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.textMuted} />
      </PressableScale>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load(1, 'refresh')} tintColor={colors.primary} />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (canLoadMore && !isLoadingMore) load(page + 1, 'more');
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>{errorMessage ?? 'Belum ada sinyal darurat.'}</Text>
          }
          ListFooterComponent={
            isLoadingMore ? <ActivityIndicator style={styles.footerLoader} color={colors.primary} /> : undefined
          }
          renderItem={({ item }) => (
            <PressableScale
              scaleTo={0.98}
              onPress={() => navigation.navigate(ROUTES.emergencyDetail, { id: String(item.id) })}>
              <Card style={styles.row}>
                <View style={styles.rowTop}>
                  <EmergencyAvatar item={item} />
                  <View style={styles.identity}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.personnel.full_name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {joinFields(item.personnel.rank, item.personnel.unit)}
                    </Text>
                  </View>
                  <Badge
                    label={emergencyStatusLabel[item.status] ?? item.status}
                    variant={emergencyStatusBadgeVariant[item.status] ?? 'neutral'}
                  />
                </View>

                <View style={styles.detailRow}>
                  <Icon name="map-pin" size={14} color={colors.textMuted} />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {item.address ?? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="clock" size={14} color={colors.textMuted} />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {formatRelativeTime(item.created_at) ?? '-'} · {formatDateTime(item.created_at) ?? '-'}
                  </Text>
                </View>

                <View style={styles.footerRow}>
                  <Text style={styles.detailLink}>Lihat detail</Text>
                  <Icon name="chevron-right" size={16} color={colors.primary} />
                </View>
              </Card>
            </PressableScale>
          )}
        />
      )}

      <FilterSheet
        visible={isFilterVisible}
        fields={[STATUS_FILTER_FIELD]}
        value={filters}
        onApply={setFilters}
        onRequestClose={() => setIsFilterVisible(false)}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    marginHorizontal: 24,
    marginTop: 4,
    marginBottom: 12,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  filterBarText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  loader: {
    marginTop: 48,
  },
  footerLoader: {
    marginVertical: 16,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 96,
    gap: 12,
  },
  empty: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
  row: {
    gap: 8,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: colors.neutralSurface,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  detailLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
