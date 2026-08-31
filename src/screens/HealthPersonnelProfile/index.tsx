import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import HealthRecordCard from '@/components/molecules/HealthRecordCard';
import PersonAvatar from '@/components/molecules/PersonAvatar';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  getHealthPersonnelProfileApi,
  getHealthPersonnelRecordsApi,
} from '@/services/api/health.service';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { HealthPersonnelProfile, HealthRecordSummary } from '@/types';
import { extractErrorMessage, formatDateTime, joinFields, orDash } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.healthPersonnelProfile>;

// Profil kesehatan anggota (petugas kesehatan): identitas + ringkasan + riwayat pemeriksaan
// berpaginasi + tombol catat pemeriksaan baru.
export default function HealthPersonnelProfileScreen(props: Props) {
  const { navigation, route } = props;
  const { nrp } = route.params;

  const [profile, setProfile] = useState<HealthPersonnelProfile | null>(null);
  const [records, setRecords] = useState<HealthRecordSummary[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);
      try {
        const [profileData, recordsData] = await Promise.all([
          getHealthPersonnelProfileApi(nrp),
          getHealthPersonnelRecordsApi(nrp, { page: 1 }),
        ]);
        setProfile(profileData);
        setRecords(recordsData.items);
        setPage(recordsData.meta.current_page);
        setLastPage(recordsData.meta.last_page);
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat profil kesehatan.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [nrp],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  // Kembali dari form input/detail → auto refresh supaya record baru/terubah langsung tampil.
  // Lewati fokus pertama (useEffect di atas sudah memuat saat mount).
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      load('refresh');
    }, [load]),
  );

  async function loadMore() {
    if (isLoadingMore || page >= lastPage) return;
    setIsLoadingMore(true);
    try {
      const next = await getHealthPersonnelRecordsApi(nrp, { page: page + 1 });
      setRecords(previous => [...previous, ...next.items]);
      setPage(next.meta.current_page);
      setLastPage(next.meta.last_page);
    } catch {
      // diamkan — tombol tetap bisa dicoba lagi
    } finally {
      setIsLoadingMore(false);
    }
  }

  const summary = profile?.health_summary;
  const lastRecord = summary?.last_record ?? null;

  return (
    <MainLayout
      title="Profil Kesehatan"
      subtitle="Riwayat & catat pemeriksaan anggota"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : errorMessage && !profile ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{errorMessage}</Text>
          <Button label="Coba Lagi" variant="secondary" onPress={() => load('initial')} />
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
          <View style={styles.headerCard}>
            <PersonAvatar photo={profile?.photo} name={profile?.full_name ?? '?'} size={64} />
            <View style={styles.headerBody}>
              <Text style={styles.name}>
                {joinFields(profile?.rank, profile?.full_name) || profile?.full_name}
              </Text>
              <Text style={styles.meta}>NRP {profile?.service_number}</Text>
              <Text style={styles.meta}>{joinFields(profile?.position, profile?.unit) || '-'}</Text>
              {profile?.status ? (
                <Badge
                  label={profile.status === 'active' ? 'Aktif' : profile.status}
                  variant={profile.status === 'active' ? 'success' : 'neutral'}
                  style={styles.statusBadge}
                />
              ) : null}
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryValue}>{summary?.total_records ?? 0}</Text>
              <Text style={styles.summaryLabel}>Total Riwayat</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCell}>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {lastRecord ? orDash(lastRecord.result) : '-'}
              </Text>
              <Text style={styles.summaryLabel} numberOfLines={1}>
                {lastRecord ? formatDateTime(lastRecord.examined_at) ?? 'Pemeriksaan terakhir' : 'Belum ada pemeriksaan'}
              </Text>
            </View>
          </View>

          <GradientButton
            label="Catat Pemeriksaan"
            onPress={() =>
              navigation.navigate(ROUTES.healthRecordInput, {
                nrp,
                personnelName: joinFields(profile?.rank, profile?.full_name) || profile?.full_name,
              })
            }
            style={styles.recordButton}
          />

          <Text style={styles.sectionTitle}>Riwayat Pemeriksaan</Text>
          {records.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada pemeriksaan tercatat.</Text>
          ) : (
            <View style={styles.list}>
              {records.map(record => (
                <HealthRecordCard
                  key={record.id}
                  record={record}
                  onPress={() =>
                    navigation.navigate(ROUTES.healthRecordDetail, { recordId: record.id })
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  headerCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  headerBody: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: '700', color: colors.heading },
  meta: { fontSize: 12, color: colors.textMuted },
  statusBadge: { marginTop: 6 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  summaryCell: { flex: 1, alignItems: 'center', gap: 2 },
  summaryDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.borderSoft },
  summaryValue: { fontSize: 16, fontWeight: '700', color: colors.heading },
  summaryLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  recordButton: { marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.heading, marginTop: 24, marginBottom: 12 },
  list: { gap: 10 },
  emptyText: { fontSize: 13, color: colors.textMuted, paddingVertical: 8 },
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
  error: { fontSize: 13, color: colors.danger, textAlign: 'center' },
});
