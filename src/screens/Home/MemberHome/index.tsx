import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import PressableScale from '@/components/atoms/PressableScale';
import ScreenBackground from '@/components/atoms/ScreenBackground';
import SyncStrip from '@/components/molecules/SyncStrip';
import MemberIdCard from '@/components/organisms/MemberIdCard';
import QrIdentityModal from '@/components/organisms/QrIdentityModal';
import AssetCard from '@/screens/Home/MemberHome/AssetCard';
import NoticeRow from '@/screens/Home/MemberHome/NoticeRow';
import ShortcutButton from '@/screens/Home/MemberHome/ShortcutButton';
import StatusTile from '@/screens/Home/MemberHome/StatusTile';
import TimelineRow from '@/screens/Home/MemberHome/TimelineRow';
import HomeHeader from '@/screens/Home/HomeHeader';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { ROUTES } from '@/navigation/paths';
import type { MainTabScreenProps, RootStackParamList } from '@/navigation/types';
import { getMyLocationApi } from '@/services/api/location.service';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { AuthUser, MyLocationResult } from '@/types';
import { formatRelativeTime } from '@/utils/format';
import { contentEnterTransition } from '@/utils/motion';

export type MemberHomeNavigationProp = CompositeNavigationProp<
  MainTabScreenProps<'Home'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

export interface MemberHomeProps {
  user: AuthUser | null;
  navigation: MemberHomeNavigationProp;
  onRefresh: () => Promise<void>;
}

// Semua data di bawah ini masih contoh/placeholder mengikuti desain — kontrak endpoint aslinya
// ada di API_CONTRACT_ANGGOTA.md. Yang sudah nyata: identitas Kartu Anggota (user.personnel) dan
// tile "Lokasi Terakhir" / "Update Terakhir" (GET /locations/me).
const DUMMY_MOVEMENTS = [
  { id: 'm1', direction: 'in' as const, title: 'Masuk Markas', detail: 'Pos Utama', time: '08:14' },
  { id: 'm2', direction: 'out' as const, title: 'Keluar Markas', detail: 'Dinas', time: '07:05' },
  { id: 'm3', direction: 'in' as const, title: 'Masuk Markas', detail: 'Pos Utama', time: 'Kemarin 17:42' },
];

const DUMMY_NOTICES = [
  {
    id: 'n1',
    type: 'announcement' as const,
    title: 'Pengumuman Apel Pagi',
    detail: 'Besok, 06:00 di Lapangan',
    sender: 'Pasi Ops',
    time: '08:15',
    unread: true,
  },
  {
    id: 'n2',
    type: 'info' as const,
    title: 'Perawatan Kendaraan Rutin',
    detail: 'Cek jadwal perawatan',
    sender: 'Pasi Log',
    time: 'Kemarin 16:45',
    unread: false,
  },
  {
    id: 'n3',
    type: 'info' as const,
    title: 'Latihan Menembak',
    detail: 'Lapangan Tembak 2',
    sender: 'Pasi Ops',
    time: '25 Mei 10:30',
    unread: false,
  },
];

const DUMMY_ASSETS = {
  weapon: {
    category: 'Senjata Dinas',
    name: 'SS2-V1',
    count: 1,
    lines: [
      { label: 'No. Senjata', value: 'SB-0231' },
      { label: 'Serial', value: 'PINDAD-21B0231' },
    ],
    badgeLabel: 'Baik',
    badgeVariant: 'success' as const,
  },
  vehicle: {
    category: 'Kendaraan',
    name: 'Toyota Hilux Double Cabin',
    count: 1,
    lines: [
      { label: 'No. Polisi', value: 'D 1234 AB' },
      { label: 'STNK', value: 'Aktif s/d 12 Nov 2026' },
    ],
    badgeLabel: 'STNK Aktif',
    badgeVariant: 'primary' as const,
  },
};

function accuracyLabel(accuracy: number | null | undefined): string {
  if (accuracy == null) return 'Akurasi tidak diketahui';
  if (accuracy <= 15) return 'Akurasi tinggi';
  if (accuracy <= 50) return 'Akurasi sedang';
  return 'Akurasi rendah';
}

function clockLabel(iso: string | null | undefined): string {
  if (!iso) return '-';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function MemberHome(props: MemberHomeProps) {
  const { user, navigation, onRefresh } = props;
  const bottomPadding = useTabScreenBottomPadding();
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [myLocation, setMyLocation] = useState<MyLocationResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMyLocation = useCallback(async () => {
    try {
      setMyLocation(await getMyLocationApi());
    } catch {
      // Best-effort: tile lokasi tinggal menampilkan "Belum Ada Data" kalau gagal.
    }
  }, []);

  useEffect(() => {
    loadMyLocation();
  }, [loadMyLocation]);

  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([onRefresh(), loadMyLocation()]);
      setLastSyncedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }

  const personnel = user?.personnel;
  const displayName =
    [personnel?.rank, personnel?.full_name].filter(Boolean).join(' ') || user?.name || '-';
  const serviceNumber = personnel?.service_number ?? null;
  const isActive = personnel ? personnel.status === 'active' : (user?.is_active ?? true);

  const coords = myLocation?.location ?? null;
  const syncedLabel = lastSyncedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const statusTiles = useMemo(
    () => [
      {
        icon: 'shield-check' as const,
        color: colors.success,
        label: 'Status Saat Ini',
        value: 'Di Markas',
        sub: 'Sejak 08:14',
      },
      {
        icon: 'briefcase' as const,
        color: colors.primary,
        label: 'Tugas / Dinas',
        value: 'Dinas Dalam',
        sub: 'Hari ini',
      },
      {
        icon: 'map-pin' as const,
        color: colors.warning,
        label: 'Lokasi Terakhir',
        value: coords ? 'Markas' : 'Belum Ada Data',
        sub: coords ? accuracyLabel(coords.accuracy) : '-',
      },
      {
        icon: 'clock' as const,
        color: colors.primary,
        label: 'Update Terakhir',
        value: formatRelativeTime(coords?.captured_at) ?? '-',
        sub: clockLabel(coords?.captured_at),
      },
    ],
    [coords],
  );

  function openMyMovements() {
    if (serviceNumber) {
      navigation.navigate(ROUTES.catalogDetail, {
        resource: 'personnel',
        id: serviceNumber,
        initialTab: 'visitor',
      });
    } else {
      navigation.navigate(ROUTES.comingSoon, { title: 'Riwayat Pergerakan' });
    }
  }

  const shortcuts = [
    {
      icon: 'handbook' as const,
      color: colors.success,
      label: 'Buku Saku',
      onPress: () => navigation.navigate(ROUTES.bukuSaku),
    },
    {
      icon: 'history' as const,
      color: colors.primary,
      label: 'Riwayat Pergerakan',
      onPress: openMyMovements,
    },
    {
      icon: 'megaphone' as const,
      color: colors.warning,
      label: 'Pengumuman',
      onPress: () => navigation.navigate(ROUTES.notifications),
    },
    {
      icon: 'map-pin' as const,
      color: colors.success,
      label: 'Peta Personel',
      onPress: () => navigation.navigate(ROUTES.personnelMap),
    },
    {
      icon: 'phone' as const,
      color: colors.danger,
      label: 'Kontak Darurat',
      onPress: () => navigation.navigate(ROUTES.comingSoon, { title: 'Kontak Darurat' }),
    },
  ];

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

          <MemberIdCard
            photoPath={personnel?.photo}
            name={displayName}
            serviceNumber={serviceNumber}
            rank={personnel?.rank ?? null}
            position={personnel?.current_assignment?.position ?? null}
            unit={personnel?.current_assignment?.unit ?? null}
            dutyStatusLabel={isActive ? 'AKTIF' : 'NONAKTIF'}
            verified
            onShowFullQr={() => setIsQrModalVisible(true)}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Status Saya</Text>
            <PressableScale onPress={() => navigation.navigate(ROUTES.profile)}>
              <Text style={styles.sectionLink}>Lihat Detail</Text>
            </PressableScale>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusTilesRow}>
            {statusTiles.map(tile => (
              <StatusTile key={tile.label} {...tile} />
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aset Saya</Text>
          </View>
          <View style={styles.assetRow}>
            <AssetCard
              icon="weapon"
              {...DUMMY_ASSETS.weapon}
              onPress={() => navigation.navigate(ROUTES.comingSoon, { title: 'Aset Saya' })}
            />
            <AssetCard
              icon="car"
              {...DUMMY_ASSETS.vehicle}
              onPress={() => navigation.navigate(ROUTES.comingSoon, { title: 'Aset Saya' })}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
            <PressableScale onPress={openMyMovements}>
              <Text style={styles.sectionLink}>Lihat Semua</Text>
            </PressableScale>
          </View>
          <View style={styles.listCard}>
            {DUMMY_MOVEMENTS.map((item, index) => (
              <View
                key={item.id}
                style={index < DUMMY_MOVEMENTS.length - 1 ? styles.listRowDivider : undefined}>
                <TimelineRow
                  direction={item.direction}
                  title={item.title}
                  detail={item.detail}
                  time={item.time}
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
            {DUMMY_NOTICES.map((item, index) => (
              <View
                key={item.id}
                style={index < DUMMY_NOTICES.length - 1 ? styles.listRowDivider : undefined}>
                <NoticeRow
                  type={item.type}
                  title={item.title}
                  detail={item.detail}
                  sender={item.sender}
                  time={item.time}
                  unread={item.unread}
                />
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Akses Cepat</Text>
          </View>
          <View style={styles.shortcutRow}>
            {shortcuts.map(shortcut => (
              <ShortcutButton
                key={shortcut.label}
                icon={shortcut.icon}
                color={shortcut.color}
                label={shortcut.label}
                onPress={shortcut.onPress}
                style={styles.shortcutCell}
              />
            ))}
          </View>
        </MotiView>
      </ScrollView>

      <QrIdentityModal
        visible={isQrModalVisible}
        value={serviceNumber}
        name={displayName}
        subtitle={`NRP ${serviceNumber ?? '-'}`}
        onRequestClose={() => setIsQrModalVisible(false)}
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
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  statusTilesRow: {
    gap: 10,
    paddingRight: 4,
  },
  assetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  listCard: {
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 6,
  },
  shortcutCell: {
    flex: 1,
  },
});
