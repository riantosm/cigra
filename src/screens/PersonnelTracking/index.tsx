import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import Card from '@/components/molecules/Card';
import LocationStatusBadge, { locationStatusMeta } from '@/components/molecules/LocationStatusBadge';
import FilterSheet from '@/components/organisms/FilterSheet';
import type { FilterField } from '@/components/organisms/FilterSheet';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getLocationsOverviewApi } from '@/services/api/location.service';
import { colors } from '@/theme/colors';
import type { LocationStatus, PersonnelLocationOverviewItem } from '@/types';
import { extractErrorMessage, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.personnelTracking>;

const STATUS_FILTER_FIELD: FilterField = {
  key: 'status',
  label: 'Status Data',
  options: [
    { label: locationStatusMeta.fresh.label, value: 'fresh' },
    { label: locationStatusMeta.stale.label, value: 'stale' },
    { label: locationStatusMeta.offline.label, value: 'offline' },
  ],
};

const PER_PAGE = 100;

// `GET /locations/overview` berpaginasi (meta.last_page). Ambil semua halaman sekali di depan
// supaya search bisa dikerjakan client-side atas seluruh satuan, bukan cuma halaman pertama.
async function fetchAllOverview(status?: LocationStatus): Promise<PersonnelLocationOverviewItem[]> {
  const all: PersonnelLocationOverviewItem[] = [];
  let page = 1;
  // Batas aman 20 halaman (2000 personel) supaya tidak looping tak terbatas kalau meta aneh.
  for (let i = 0; i < 20; i += 1) {
    const result = await getLocationsOverviewApi({ page, per_page: PER_PAGE, status });
    all.push(...result.items);
    if (result.items.length === 0 || result.meta.current_page >= result.meta.last_page) break;
    page += 1;
  }
  return all;
}

function formatCoordinates(item: PersonnelLocationOverviewItem): string {
  if (!item.location) return 'Belum ada data lokasi';
  const { latitude, longitude, accuracy } = item.location;
  const base = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  return accuracy != null ? `${base}  ·  ±${Math.round(accuracy)} m` : base;
}

export default function PersonnelTrackingScreen(props: Props) {
  const { navigation } = props;

  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [items, setItems] = useState<PersonnelLocationOverviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const statusFilter = (filters.status as LocationStatus | undefined) ?? undefined;
  const activeFilterCount = Object.keys(filters).length;

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      setErrorMessage(null);
      try {
        setItems(await fetchAllOverview(statusFilter));
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat data lokasi personel.'));
        setItems([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  const visibleItems = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    const filtered = query
      ? items.filter(item =>
          [item.full_name, item.service_number, item.rank ?? '', item.unit ?? '']
            .join(' ')
            .toLowerCase()
            .includes(query),
        )
      : items;
    // Urutkan berdasarkan `last_seen` saja — yang terakhir terlihat paling atas. Tanpa last_seen
    // (belum pernah kirim posisi) ditaruh paling bawah.
    return [...filtered].sort((a, b) => {
      const aSeen = a.last_seen ? new Date(a.last_seen).getTime() : 0;
      const bSeen = b.last_seen ? new Date(b.last_seen).getTime() : 0;
      return bSeen - aSeen;
    });
  }, [items, searchInput]);

  function openDetail(item: PersonnelLocationOverviewItem) {
    navigation.navigate(ROUTES.catalogDetail, {
      resource: 'personnel',
      id: item.service_number,
      initialTab: 'location',
    });
  }

  return (
    <MainLayout title="Lokasi Personel" onBack={() => navigation.goBack()}>
      <View style={styles.container}>
        <View style={styles.searchRow}>
          <TextField
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Cari nama, NRP, atau satuan..."
            returnKeyType="search"
            leftIcon="search"
            onClear={() => setSearchInput('')}
            containerStyle={styles.searchField}
            style={styles.searchInput}
          />
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
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.centerState} color={colors.primary} />
        ) : errorMessage ? (
          <Text style={styles.centerState}>{errorMessage}</Text>
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
            }
            ListHeaderComponent={
              <Text style={styles.countLabel}>
                {visibleItems.length} personel
                {statusFilter ? ` · ${locationStatusMeta[statusFilter].label}` : ''}
              </Text>
            }
            ListEmptyComponent={<Text style={styles.centerState}>Tidak ada personel yang cocok.</Text>}
            renderItem={({ item }) => (
              <PressableScale scaleTo={0.98} onPress={() => openDetail(item)}>
                <Card style={styles.row}>
                  <View style={styles.rowTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarLabel}>{item.full_name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.rowIdentity}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.full_name}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {joinFields(item.rank, item.service_number)}
                      </Text>
                    </View>
                  </View>

                  <LocationStatusBadge
                    status={item.status}
                    timestamp={item.location?.captured_at ?? item.last_seen}
                  />

                  <View style={styles.detailRow}>
                    <Icon name="building" size={14} color={colors.textMuted} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {item.unit ?? '-'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon name="map-pin" size={14} color={colors.textMuted} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {formatCoordinates(item)}
                    </Text>
                  </View>
                </Card>
              </PressableScale>
            )}
          />
        )}
      </View>

      <FilterSheet
        visible={isFilterSheetVisible}
        fields={[STATUS_FILTER_FIELD]}
        value={filters}
        onApply={setFilters}
        onRequestClose={() => setIsFilterSheetVisible(false)}
      />
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
    marginBottom: 8,
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
  countLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  centerState: {
    marginTop: 32,
    paddingHorizontal: 24,
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
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  rowIdentity: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
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
});
