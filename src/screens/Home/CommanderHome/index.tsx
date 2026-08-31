import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import ScreenBackground from '@/components/atoms/ScreenBackground';
import SyncStrip from '@/components/molecules/SyncStrip';
import PersonnelMap from '@/components/organisms/PersonnelMap';
import ActivityRow from '@/screens/Home/ActivityRow';
import AnnouncementRow from '@/screens/Home/AnnouncementRow';
import HomeHeader from '@/screens/Home/HomeHeader';
import QuickActionButton from '@/screens/Home/QuickActionButton';
import type { QuickActionButtonProps } from '@/screens/Home/QuickActionButton';
import QuickActionSheet from '@/screens/Home/QuickActionSheet';
import StatCard from '@/screens/Home/StatCard';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { ROUTES } from '@/navigation/paths';
import type { MainTabScreenProps, RootStackParamList } from '@/navigation/types';
import { getLocationsOverviewApi } from '@/services/api/location.service';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import { contentEnterTransition } from '@/utils/motion';
import type { AuthUser, PersonnelLocationOverviewItem } from '@/types';

export type CommanderHomeNavigationProp = CompositeNavigationProp<
  MainTabScreenProps<'Home'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

export interface CommanderHomeProps {
  user: AuthUser | null;
  navigation: CommanderHomeNavigationProp;
  onRefresh: () => Promise<void>;
}

// Konten dashboard di bawah ini (statistik satuan, aktivitas, pengumuman) masih contoh/placeholder
// mengikuti desain — belum ada API buat data unit-wide ini, jadi ganti dengan data asli begitu
// endpoint-nya tersedia (lihat API_CONTRACT.md).
const situationStats = [
  { icon: 'users', label: 'Total Personel', value: '427', meta: '100%', percent: 100, color: colors.primary },
  { icon: 'shield-check', label: 'Di Markas', value: '381', meta: '89.2%', percent: 89.2, color: colors.success },
  { icon: 'map-pin', label: 'Di Luar Markas', value: '46', meta: '10.8%', percent: 10.8, color: colors.warning },
  { icon: 'alert-triangle', label: 'Absen', value: '5', meta: '1.2%', percent: 1.2, color: colors.danger },
] as const;

const recentMovements = [
  { name: 'Serka Andi Pratama', detail: 'Keluar Markas • Dinas • Pos Utama', time: '14:32', direction: 'out' },
  { name: 'Praka Rizky Maulana', detail: 'Masuk Markas • Pos Utama', time: '13:58', direction: 'in' },
  { name: 'Koptu Dedi Setiawan', detail: 'Keluar Markas • Patroli • Pos Timur', time: '13:21', direction: 'out' },
] as const;

const announcements = [
  { icon: 'alert-triangle', title: 'ALARM: KADAL', detail: 'Kontigensi', sender: 'Komandan', time: '09:30', color: colors.danger, unread: true },
  { icon: 'megaphone', title: 'Pengumuman Apel Pagi', detail: 'Besok 06:00 di Lapangan Utama', sender: 'Pasi Ops', time: '08:15', color: colors.warning, unread: false },
  { icon: 'info', title: 'Perawatan Kendaraan', detail: 'Cek jadwal perawatan rutin', sender: 'Pasi Log', time: 'Kemarin 16:45', color: colors.primary, unread: false },
] as const;

// Jumlah quick action yang tampil langsung di grid Home (2 baris x 4, termasuk kartu "Lainnya" di
// slot ke-8). Sisanya (Alarm Satuan, Buku Saku, Laporan Cepat) ada di bottom sheet "Lainnya".
const VISIBLE_QUICK_ACTION_COUNT = 7;

export default function CommanderHome(props: CommanderHomeProps) {
  const { user, navigation, onRefresh } = props;
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQuickActionSheetVisible, setIsQuickActionSheetVisible] = useState(false);
  const [personnelLocations, setPersonnelLocations] = useState<PersonnelLocationOverviewItem[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);

  const loadPersonnelLocations = useCallback(async () => {
    try {
      // per_page besar — kartu pratinjau ini menampilkan semua personel yang punya lokasi sekaligus,
      // bukan list berpaginasi.
      const result = await getLocationsOverviewApi({ per_page: 50 });
      setPersonnelLocations(result.items);
    } catch {
      // Best-effort: kartu pratinjau lokasi bukan alur kritis dashboard, biarkan kosong kalau gagal.
    } finally {
      setIsLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    loadPersonnelLocations();
  }, [loadPersonnelLocations]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await Promise.all([onRefresh(), loadPersonnelLocations()]);
      setLastSyncedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }

  const syncedLabel = lastSyncedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const bottomPadding = useTabScreenBottomPadding();

  // Urutan tetap: 4 direktori katalog dulu, lalu aksi lain.
  const quickActions: QuickActionButtonProps[] = [
    {
      icon: 'profile',
      label: 'Distribusi Personel',
      color: colors.primary,
      onPress: () => navigation.navigate(ROUTES.catalogList, { resource: 'personnel' }),
    },
    {
      icon: 'users',
      label: 'Keluarga (Persit)',
      color: colors.gradientFamilyEnd,
      onPress: () => navigation.navigate(ROUTES.catalogList, { resource: 'persit' }),
    },
    {
      icon: 'car',
      label: 'Kendaraan',
      color: colors.gradientHealthStart,
      onPress: () => navigation.navigate(ROUTES.catalogList, { resource: 'vehicles' }),
    },
    {
      icon: 'weapon',
      label: 'Kategori Senjata',
      color: colors.gradientWeaponStart,
      onPress: () => navigation.navigate(ROUTES.catalogList, { resource: 'weapon-categories' }),
    },
    {
      icon: 'weapon',
      label: 'Distribusi Senjata',
      color: colors.gradientEntryStart,
      onPress: () => navigation.navigate(ROUTES.catalogList, { resource: 'weapon-assignments' }),
    },
    {
      icon: 'map-pin',
      label: 'Peta Personel',
      color: colors.success,
      onPress: () => navigation.navigate(ROUTES.personnelTracking),
    },
    {
      icon: 'megaphone',
      label: 'Kirim Pengumuman',
      color: colors.warning,
      onPress: () => navigation.navigate(ROUTES.sendAnnouncement),
    },
    {
      icon: 'emergency',
      label: 'Alarm Satuan',
      color: colors.gradientWeaponStart,
      onPress: () => navigation.navigate(ROUTES.alarmSatuan),
    },
    {
      icon: 'handbook',
      label: 'Buku Saku',
      color: colors.primary,
      onPress: () => navigation.navigate(ROUTES.bukuSaku),
    },
    {
      icon: 'clipboard-check',
      label: 'Laporan Cepat',
      color: colors.gradientHealthStart,
      onPress: () => navigation.navigate(ROUTES.comingSoon, { title: 'Laporan Cepat' }),
    },
  ];
  const gridActions: QuickActionButtonProps[] = [
    ...quickActions.slice(0, VISIBLE_QUICK_ACTION_COUNT),
    { icon: 'grid', label: 'Lainnya', color: colors.primary, onPress: () => setIsQuickActionSheetVisible(true) },
  ];
  const quickActionRows = [gridActions.slice(0, 4), gridActions.slice(4, 8)];

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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }>
        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={contentEnterTransition}>
          <SyncStrip syncedLabel={syncedLabel} onPress={handleRefresh} style={styles.syncStrip} />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Action</Text>
          </View>
          <View style={styles.quickActionGrid}>
            {quickActionRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.quickActionRow}>
                {row.map(action => (
                  <QuickActionButton
                    key={action.label}
                    icon={action.icon}
                    label={action.label}
                    color={action.color}
                    onPress={action.onPress}
                    style={styles.quickActionCell}
                  />
                ))}
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ringkasan Situasi</Text>
          </View>
          <View style={styles.statGrid}>
            {[situationStats.slice(0, 2), situationStats.slice(2, 4)].map((row, rowIndex) => (
              <View key={rowIndex} style={styles.statRow}>
                {row.map(stat => (
                  <StatCard
                    key={stat.label}
                    icon={stat.icon}
                    label={stat.label}
                    value={stat.value}
                    meta={stat.meta}
                    color={stat.color}
                    percent={stat.percent}
                  />
                ))}
              </View>
            ))}
          </View>

          <PressableScale
            scaleTo={0.98}
            onPress={() => navigation.navigate(ROUTES.emergencyList)}
            contentStyle={styles.alertBanner}>
            <View style={styles.alertIconChip}>
              <Icon name="emergency" size={20} color={colors.danger} />
            </View>
            <View style={styles.alertTextGroup}>
              <Text style={styles.alertTitle}>1 Emergency Terakhir</Text>
              <Text style={styles.alertSubtitle}>Perhatian diperlukan</Text>
            </View>
            <View style={styles.alertLink}>
              <Text style={styles.alertLinkText}>Lihat Detail</Text>
              <Icon name="chevron-right" size={16} color={colors.dangerText} />
            </View>
          </PressableScale>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
            <Text style={styles.sectionLinkDisabled}>Lihat Semua</Text>
          </View>
          <View style={styles.listCard}>
            {recentMovements.map((movement, index) => (
              <View
                key={movement.name}
                style={index < recentMovements.length - 1 ? styles.listRowDivider : undefined}>
                <ActivityRow
                  name={movement.name}
                  detail={movement.detail}
                  time={movement.time}
                  direction={movement.direction}
                />
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pengumuman Terbaru</Text>
            <PressableScale onPress={() => navigation.navigate(ROUTES.notifications)}>
              <Text style={styles.sectionLink}>Lihat Semua</Text>
            </PressableScale>
          </View>
          <View style={styles.listCard}>
            {announcements.map((item, index) => (
              <View
                key={item.title}
                style={index < announcements.length - 1 ? styles.listRowDivider : undefined}>
                <AnnouncementRow
                  icon={item.icon}
                  title={item.title}
                  detail={item.detail}
                  sender={item.sender}
                  time={item.time}
                  color={item.color}
                  unread={item.unread}
                />
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Peta Personel Real-time</Text>
            <PressableScale onPress={() => navigation.navigate(ROUTES.personnelMap)}>
              <Text style={styles.sectionLink}>Lihat Peta Lengkap</Text>
            </PressableScale>
          </View>
          {isLoadingLocations ? (
            <View style={styles.mapPlaceholder}>
              <Icon name="map-pin" size={28} color={colors.textMuted} />
              <Text style={styles.mapPlaceholderText}>Memuat lokasi personel...</Text>
            </View>
          ) : (
            <PersonnelMap personnel={personnelLocations} interactive={false} lite style={styles.mapPreview} />
          )}
        </MotiView>
      </ScrollView>

      <QuickActionSheet
        visible={isQuickActionSheetVisible}
        actions={quickActions}
        onRequestClose={() => setIsQuickActionSheetVisible(false)}
      />
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
  syncStrip: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  sectionLinkDisabled: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    opacity: 0.6,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  quickActionGrid: {
    gap: 10,
    marginBottom: 24,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionCell: {
    flex: 1,
  },
  statGrid: {
    gap: 10,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.alertBannerBorder,
    backgroundColor: colors.alertBannerStart,
    marginBottom: 24,
    shadowColor: colors.danger,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  alertIconChip: {
    height: 38,
    width: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  alertTextGroup: {
    flex: 1,
    gap: 2,
  },
  alertLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  alertLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dangerText,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dangerText,
  },
  alertSubtitle: {
    fontSize: 12,
    color: colors.danger,
  },
  listCard: {
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    marginBottom: 24,
    ...cardShadow,
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  mapPreview: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 24,
  },
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.mapCanvasStart,
    marginBottom: 24,
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
