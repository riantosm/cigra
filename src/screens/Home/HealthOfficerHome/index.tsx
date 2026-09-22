import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import PressableScale from '@/components/atoms/PressableScale';
import ScreenBackground from '@/components/atoms/ScreenBackground';
import HealthRecordCard from '@/components/molecules/HealthRecordCard';
import SyncStrip from '@/components/molecules/SyncStrip';
import HomeHeader from '@/screens/Home/HomeHeader';
import HomeWeatherWidget from '@/screens/Home/HomeWeatherWidget';
import type { HomeWeatherWidgetHandle } from '@/screens/Home/HomeWeatherWidget';
import QuickActionButton from '@/screens/Home/QuickActionButton';
import StatCard from '@/screens/Home/StatCard';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { ROUTES } from '@/navigation/paths';
import type { MainTabScreenProps, RootStackParamList } from '@/navigation/types';
import { getHealthDashboardApi } from '@/services/api/health.service';
import { colors } from '@/theme/colors';
import type { AuthUser, HealthDashboard } from '@/types';
import { cleanValue } from '@/utils/format';
import { contentEnterTransition } from '@/utils/motion';

export type HealthOfficerHomeNavigationProp = CompositeNavigationProp<
  MainTabScreenProps<'Home'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

export interface HealthOfficerHomeProps {
  user: AuthUser | null;
  navigation: HealthOfficerHomeNavigationProp;
  onRefresh: () => Promise<void>;
}

// Home khusus role `petugas_kesehatan` — dipilih di screens/Home/index.tsx berdasar role.
// Ringkasan singkat + 3 quick action (input pemeriksaan, cari anggota, dashboard).
export default function HealthOfficerHome(props: HealthOfficerHomeProps) {
  const { user, navigation, onRefresh } = props;
  const bottomPadding = useTabScreenBottomPadding();
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<HealthDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFirstFocus = useRef(true);
  const weatherRef = useRef<HomeWeatherWidgetHandle>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setDashboard(await getHealthDashboardApi());
    } catch {
      // Best-effort: ringkasan bukan blocker, biarkan kosong kalau gagal.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Refresh ringkasan tiap kali kembali ke tab Home (mis. setelah mencatat pemeriksaan baru).
  // Lewati fokus pertama karena useEffect di atas sudah memuat saat mount.
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      loadDashboard();
    }, [loadDashboard]),
  );

  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([onRefresh(), loadDashboard(), weatherRef.current?.reload()]);
      setLastSyncedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }

  const syncedLabel = lastSyncedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const displayName =
    [cleanValue(user?.personnel?.rank), cleanValue(user?.personnel?.full_name)].filter(Boolean).join(' ') ||
    user?.name ||
    'Petugas';

  const quickActions = [
    {
      icon: 'clipboard-check' as const,
      label: 'Input Pemeriksaan',
      color: colors.gradientHealthStart,
      gradientColors: [colors.gradientHealthStart, colors.gradientHealthEnd] as const,
      onPress: () => navigation.navigate(ROUTES.healthPersonnelSearch, { mode: 'input' }),
    },
    {
      icon: 'search' as const,
      label: 'Cari Anggota',
      color: colors.primary,
      gradientColors: [colors.gradientPersonnelStart, colors.gradientPersonnelEnd] as const,
      onPress: () => navigation.navigate(ROUTES.healthPersonnelSearch),
    },
    {
      icon: 'bar-chart' as const,
      label: 'Lihat Dashboard',
      color: colors.gradientHealthEnd,
      gradientColors: [colors.gradientHealthStart, colors.gradientHealthEnd] as const,
      onPress: () => navigation.navigate(ROUTES.healthDashboard),
    },
  ];

  const recent = dashboard?.recent ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenBackground />
      <HomeHeader
        user={user}
        onAvatarPress={() => navigation.navigate(ROUTES.profile)}
        onBellPress={() => navigation.navigate(ROUTES.notifications)}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }>
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}>
          <SyncStrip syncedLabel={syncedLabel} onPress={handleRefresh} style={styles.syncStrip} />

          <HomeWeatherWidget ref={weatherRef} style={styles.weatherWidget} />

          <Text style={styles.greeting}>Halo, {displayName}</Text>
          <Text style={styles.greetingSub}>Petugas Kesehatan Satuan</Text>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aksi Cepat</Text>
          </View>
          <View style={styles.quickActionRow}>
            {quickActions.map(action => (
              <QuickActionButton
                key={action.label}
                icon={action.icon}
                label={action.label}
                color={action.color}
                gradientColors={action.gradientColors}
                onPress={action.onPress}
                style={styles.quickActionCell}
                compact
              />
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ringkasan Pemeriksaan</Text>
            <PressableScale onPress={() => navigation.navigate(ROUTES.healthDashboard)}>
              <Text style={styles.sectionLink}>Dashboard</Text>
            </PressableScale>
          </View>
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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
          </View>
          {isLoading ? (
            <Text style={styles.emptyText}>Memuat aktivitas...</Text>
          ) : recent.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada pemeriksaan tercatat.</Text>
          ) : (
            <View style={styles.recentList}>
              {recent.map(record => (
                <HealthRecordCard
                  key={record.id}
                  record={record}
                  onPress={() =>
                    navigation.navigate(ROUTES.healthRecordDetail, { recordId: record.id })
                  }
                />
              ))}
            </View>
          )}
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageGradientStart,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  syncStrip: { marginBottom: 20 },
  weatherWidget: { marginBottom: 20 },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.heading,
  },
  greetingSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  sectionLink: { fontSize: 13, fontWeight: '600', color: colors.primary },
  quickActionRow: { flexDirection: 'row', gap: 10 },
  quickActionCell: { flex: 1 },
  statRow: { flexDirection: 'row', gap: 10 },
  recentList: { gap: 10 },
  emptyText: { fontSize: 13, color: colors.textMuted, paddingVertical: 8 },
});
