import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import HealthRecordCard from '@/components/molecules/HealthRecordCard';
import PersonAvatar from '@/components/molecules/PersonAvatar';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getMyHealthHistoryApi } from '@/services/api/health.service';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { HealthMyHistory, HealthRecordSummary } from '@/types';
import { extractErrorMessage, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.healthMyHistory>;

// Riwayat kesehatan milik anggota sendiri (GET /health/my, read-only). Dibuka dari menu
// "Kesehatan" di tab Riwayat.
export default function HealthMyHistoryScreen(props: Props) {
  const { navigation } = props;

  const [personnel, setPersonnel] = useState<HealthMyHistory['personnel'] | null>(null);
  const [records, setRecords] = useState<HealthRecordSummary[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const res = await getMyHealthHistoryApi({ page: 1 });
      setPersonnel(res.data.personnel);
      setRecords(res.data.records);
      setPage(res.meta.current_page);
      setLastPage(res.meta.last_page);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat riwayat kesehatan.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  async function loadMore() {
    if (isLoadingMore || page >= lastPage) return;
    setIsLoadingMore(true);
    try {
      const res = await getMyHealthHistoryApi({ page: page + 1 });
      setRecords(previous => [...previous, ...res.data.records]);
      setPage(res.meta.current_page);
      setLastPage(res.meta.last_page);
    } catch {
      // diamkan
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <MainLayout
      title="Riwayat Kesehatan"
      subtitle="Riwayat pemeriksaan kesehatan Anda"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => load('refresh')}
              tintColor={colors.primary}
            />
          }>
          {personnel ? (
            <View style={styles.headerCard}>
              <PersonAvatar photo={personnel.photo} name={personnel.full_name} size={48} />
              <View style={styles.headerBody}>
                <Text style={styles.name} numberOfLines={1}>
                  {joinFields(personnel.rank, personnel.full_name) || personnel.full_name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {joinFields(`NRP ${personnel.service_number}`, personnel.unit)}
                </Text>
              </View>
            </View>
          ) : null}

          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : records.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada pemeriksaan kesehatan tercatat.</Text>
          ) : (
            <View style={styles.list}>
              {records.map(record => (
                <HealthRecordCard
                  key={record.id}
                  record={record}
                  hideExaminer
                  onPress={() =>
                    navigation.navigate(ROUTES.healthRecordDetail, {
                      recordId: record.id,
                      // GET /health/records/{id} khusus petugas — bawa datanya sendiri dari /health/my.
                      record: {
                        ...record,
                        notes: record.notes ?? null,
                        attachment_url: record.attachment_url ?? null,
                        personnel: personnel
                          ? {
                              id: personnel.id,
                              service_number: personnel.service_number,
                              full_name: personnel.full_name,
                              rank: personnel.rank,
                              unit: personnel.unit,
                              photo: personnel.photo,
                            }
                          : null,
                      },
                      readOnly: true,
                    })
                  }
                />
              ))}
              {page < lastPage ? (
                <PressableScale scaleTo={0.98} onPress={loadMore} contentStyle={styles.loadMore}>
                  {isLoadingMore ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Icon name="chevron-down" size={16} color={colors.primary} />
                      <Text style={styles.loadMoreText}>Muat lebih banyak</Text>
                    </>
                  )}
                </PressableScale>
              ) : null}
            </View>
          )}
        </ScrollView>
      )}
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    marginBottom: 16,
    ...cardShadow,
  },
  headerBody: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: colors.heading },
  meta: { fontSize: 12, color: colors.textMuted },
  list: { gap: 10 },
  emptyText: { fontSize: 13, color: colors.textMuted, paddingVertical: 8 },
  error: { fontSize: 13, color: colors.danger, paddingVertical: 8 },
  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
