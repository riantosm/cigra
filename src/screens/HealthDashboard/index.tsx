import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import HealthRecordCard from '@/components/molecules/HealthRecordCard';
import StatCard from '@/screens/Home/StatCard';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getHealthDashboardApi } from '@/services/api/health.service';
import { colors } from '@/theme/colors';
import type { HealthDashboard } from '@/types';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.healthDashboard>;

// Dashboard Petugas Kesehatan: ringkasan diperiksa hari ini, total bulan berjalan, aktivitas terbaru.
export default function HealthDashboardScreen(props: Props) {
  const { navigation } = props;
  const [dashboard, setDashboard] = useState<HealthDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);
    try {
      setDashboard(await getHealthDashboardApi());
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat dashboard.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  const recent = dashboard?.recent ?? [];

  return (
    <MainLayout title="Dashboard Kesehatan" onBack={() => navigation.goBack()}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => load('refresh')}
            tintColor={colors.primary}
          />
        }>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <View style={styles.statRow}>
          <StatCard
            icon="clipboard-check"
            label="Diperiksa Hari Ini"
            value={isLoading ? '—' : String(dashboard?.today_checked ?? 0)}
            meta="Hari ini"
            color={colors.gradientHealthStart}
          />
          <StatCard
            icon="bar-chart"
            label="Total Bulan Ini"
            value={isLoading ? '—' : String(dashboard?.month_total ?? 0)}
            meta="Bulan berjalan"
            color={colors.primary}
          />
        </View>

        <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
        {isLoading ? (
          <Text style={styles.emptyText}>Memuat aktivitas...</Text>
        ) : recent.length === 0 ? (
          <Text style={styles.emptyText}>Belum ada pemeriksaan tercatat.</Text>
        ) : (
          <View style={styles.list}>
            {recent.map(record => (
              <HealthRecordCard
                key={record.id}
                record={record}
                onPress={() => navigation.navigate(ROUTES.healthRecordDetail, { recordId: record.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 8,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
    marginBottom: 12,
  },
});
