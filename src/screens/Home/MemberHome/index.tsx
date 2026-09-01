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
import MessageDetailSheet from '@/components/organisms/MessageDetailSheet';
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
import { useAppSelector } from '@/store/hooks';
import { getMyLocationApi } from '@/services/api/location.service';
import {
  getMyAssetsApi,
  getMyIdCardApi,
  getMyMovementsApi,
  getMyStatusApi,
} from '@/services/api/me.service';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type {
  Announcement,
  AuthUser,
  MeAssets,
  MeIdCard,
  MeMovement,
  MeStatus,
  MyLocationResult,
} from '@/types';
import type { BadgeVariant } from '@/components/atoms/Badge';
import type { IconName } from '@/components/atoms/Icon';
import { formatDateShort, formatDateTime, formatRelativeTime, joinFields, titleCase } from '@/utils/format';
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

import type { NoticeType } from '@/screens/Home/MemberHome/NoticeRow';

// "Pengumuman Terbaru" diambil dari GET /announcements (redux `announcements` slice, dimuat di
// Home/index.tsx). Sisanya lewat /me/id-card, /me/status, /me/assets, /me/movements.
const NOTICE_TYPES: NoticeType[] = ['alert', 'announcement', 'info'];

function toNoticeType(type: string): NoticeType {
  return (NOTICE_TYPES as string[]).includes(type) ? (type as NoticeType) : 'info';
}

// Ikon/warna sheet baca-penuh — samakan dengan NoticeRow (alert→danger, announcement→primary, info→warning).
const NOTICE_META: Record<NoticeType, { icon: IconName; color: string; surface: string }> = {
  alert: { icon: 'alert-triangle', color: colors.danger, surface: colors.dangerSurface },
  announcement: { icon: 'megaphone', color: colors.primary, surface: colors.primarySurface },
  info: { icon: 'calendar', color: colors.warning, surface: colors.warningSurface },
};

type AssetCardData = {
  category: string;
  name: string;
  count: number;
  lines: { label: string; value: string }[];
  badgeLabel: string;
  badgeVariant: BadgeVariant;
};

const EMPTY_WEAPON_CARD: AssetCardData = {
  category: 'Senjata Dinas',
  name: 'Belum ada senjata dinas',
  count: 0,
  lines: [],
  badgeLabel: 'Tidak ada',
  badgeVariant: 'neutral',
};

const EMPTY_VEHICLE_CARD: AssetCardData = {
  category: 'Kendaraan',
  name: 'Belum ada kendaraan',
  count: 0,
  lines: [],
  badgeLabel: 'Tidak ada',
  badgeVariant: 'neutral',
};

function conditionVariant(status: string): BadgeVariant {
  const key = status.toLowerCase();
  if (key.includes('good') || key.includes('baik') || key.includes('siap')) return 'success';
  if (key.includes('minor') || key.includes('ringan') || key.includes('rusak_ringan')) return 'warning';
  if (key.includes('damage') || key.includes('rusak') || key.includes('berat')) return 'danger';
  return 'neutral';
}

function stnkVariant(status: string): BadgeVariant {
  if (status === 'active') return 'primary';
  if (status === 'expiring_soon') return 'warning';
  if (status === 'expired') return 'danger';
  return 'neutral';
}

function toWeaponCard(assets: MeAssets | null): AssetCardData {
  const weapon = assets?.weapons?.[0];
  if (!weapon) return EMPTY_WEAPON_CARD;
  return {
    category: 'Senjata Dinas',
    name: weapon.category || weapon.weapon_number,
    count: assets?.weapons.length ?? 1,
    lines: [
      { label: 'No. Senjata', value: weapon.weapon_number },
      ...(weapon.serial_number ? [{ label: 'Serial', value: weapon.serial_number }] : []),
    ],
    badgeLabel: weapon.condition_label || titleCase(weapon.condition_status) || 'Kondisi -',
    badgeVariant: conditionVariant(weapon.condition_status),
  };
}

function toVehicleCard(assets: MeAssets | null): AssetCardData {
  const vehicle = assets?.vehicles?.[0];
  if (!vehicle) return EMPTY_VEHICLE_CARD;
  return {
    category: 'Kendaraan',
    name: vehicle.brand_model,
    count: assets?.vehicles.length ?? 1,
    lines: [
      ...(vehicle.plate_number ? [{ label: 'No. Polisi', value: vehicle.plate_number }] : []),
      ...(vehicle.stnk_valid_until
        ? [{ label: 'STNK', value: `s/d ${formatDateShort(vehicle.stnk_valid_until)}` }]
        : []),
    ],
    badgeLabel:
      vehicle.stnk_status_label || titleCase(vehicle.stnk_status) || 'STNK -',
    badgeVariant: stnkVariant(vehicle.stnk_status),
  };
}

function movementTitle(movement: MeMovement): string {
  if (movement.note) return movement.note;
  return movement.direction === 'out' ? 'Keluar Markas' : 'Masuk Markas';
}

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
  const announcements = useAppSelector(state => state.announcements.items);
  const [selectedNotice, setSelectedNotice] = useState<Announcement | null>(null);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [myLocation, setMyLocation] = useState<MyLocationResult | null>(null);
  const [idCard, setIdCard] = useState<MeIdCard | null>(null);
  const [status, setStatus] = useState<MeStatus | null>(null);
  const [assets, setAssets] = useState<MeAssets | null>(null);
  const [movements, setMovements] = useState<MeMovement[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMyLocation = useCallback(async () => {
    try {
      setMyLocation(await getMyLocationApi());
    } catch {
      // Best-effort: tile lokasi tinggal menampilkan "Belum Ada Data" kalau gagal.
    }
  }, []);

  // Tiap surface dimuat independen (allSettled) — mis. GET /me/assets sempat 500 di backend,
  // jangan sampai menjatuhkan Kartu Anggota / Status / Aktivitas.
  const loadMe = useCallback(async () => {
    const [idCardResult, statusResult, assetsResult, movementsResult] = await Promise.allSettled([
      getMyIdCardApi(),
      getMyStatusApi(),
      getMyAssetsApi(),
      getMyMovementsApi({ per_page: 3 }),
    ]);
    if (idCardResult.status === 'fulfilled') setIdCard(idCardResult.value);
    if (statusResult.status === 'fulfilled') setStatus(statusResult.value);
    if (assetsResult.status === 'fulfilled') setAssets(assetsResult.value);
    if (movementsResult.status === 'fulfilled') setMovements(movementsResult.value.items);
  }, []);

  useEffect(() => {
    loadMyLocation();
    loadMe();
  }, [loadMyLocation, loadMe]);

  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([onRefresh(), loadMyLocation(), loadMe()]);
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

  const idCardVerified = (idCard?.verification_status ?? '') === 'verified';
  const qrPayload = idCard?.qr_payload ?? serviceNumber;

  const weaponCard = useMemo(() => toWeaponCard(assets), [assets]);
  const vehicleCard = useMemo(() => toVehicleCard(assets), [assets]);

  const statusTiles = useMemo(() => {
    const presence = status?.presence ?? null;
    const duty = status?.duty ?? null;
    const loc = status?.location ?? null;
    const locCapturedAt = loc?.captured_at ?? coords?.captured_at ?? null;

    return [
      {
        icon: 'shield-check' as const,
        color: colors.success,
        label: 'Status Saat Ini',
        value: presence?.label ?? 'Belum Ada Data',
        sub: presence?.since ? `Sejak ${clockLabel(presence.since)}` : '-',
      },
      {
        icon: 'briefcase' as const,
        color: colors.primary,
        label: 'Tugas / Dinas',
        value: duty?.label ?? 'Belum Ada Data',
        sub: duty?.period_label ?? '-',
      },
      {
        icon: 'map-pin' as const,
        color: colors.warning,
        label: 'Lokasi Terakhir',
        value: loc?.label ?? (coords ? 'Tersedia' : 'Belum Ada Data'),
        sub: loc?.accuracy_label ?? (coords ? accuracyLabel(coords.accuracy) : '-'),
      },
      {
        icon: 'clock' as const,
        color: colors.primary,
        label: 'Update Terakhir',
        value: formatRelativeTime(locCapturedAt) ?? '-',
        sub: clockLabel(locCapturedAt),
      },
    ];
  }, [status, coords]);

  function openMyMovements() {
    navigation.navigate(ROUTES.myMovements);
  }

  const shortcuts = [
    {
      icon: 'handbook' as const,
      color: colors.success,
      label: 'Buku Saku',
      onPress: () => navigation.navigate(ROUTES.bukuSaku),
    },
    {
      icon: 'megaphone' as const,
      color: colors.warning,
      label: 'Pengumuman',
      onPress: () => navigation.navigate(ROUTES.announcements),
    },
    {
      icon: 'phone' as const,
      color: colors.danger,
      label: 'Kontak Darurat',
      onPress: () => navigation.navigate(ROUTES.emergencyContacts),
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
            verified={idCardVerified}
            qrPayload={qrPayload}
            onShowFullQr={() => setIsQrModalVisible(true)}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Status Saya</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statusTilesScroll}
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
              style={styles.assetCard}
              {...weaponCard}
              onPress={() => navigation.navigate(ROUTES.comingSoon, { title: 'Aset Saya' })}
            />
            <AssetCard
              icon="car"
              style={styles.assetCard}
              {...vehicleCard}
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
            {movements.length === 0 ? (
              <Text style={styles.emptyRow}>Belum ada aktivitas keluar/masuk.</Text>
            ) : (
              movements.map((item, index) => (
                <View
                  key={item.id}
                  style={index < movements.length - 1 ? styles.listRowDivider : undefined}>
                  <TimelineRow
                    direction={item.direction === 'out' ? 'out' : 'in'}
                    title={movementTitle(item)}
                    detail={item.location_label ?? item.purpose ?? '-'}
                    time={formatRelativeTime(item.occurred_at) ?? clockLabel(item.occurred_at)}
                  />
                </View>
              ))
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pengumuman Terbaru</Text>
            <PressableScale onPress={() => navigation.navigate(ROUTES.announcements)}>
              <Text style={styles.sectionLink}>Lihat Semua</Text>
            </PressableScale>
          </View>
          <View style={styles.listCard}>
            {announcements.length === 0 ? (
              <Text style={styles.emptyRow}>Belum ada pengumuman.</Text>
            ) : (
              announcements.slice(0, 3).map((item, index, shown) => (
                <PressableScale
                  key={item.id}
                  scaleTo={0.98}
                  onPress={() => setSelectedNotice(item)}
                  style={index < shown.length - 1 ? styles.listRowDivider : undefined}>
                  <NoticeRow
                    type={toNoticeType(item.type)}
                    title={item.title}
                    detail={item.body}
                    sender={item.created_by?.name ?? 'Komando'}
                    time={formatRelativeTime(item.published_at) ?? '-'}
                  />
                </PressableScale>
              ))
            )}
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
        value={qrPayload}
        name={displayName}
        subtitle={`NRP ${serviceNumber ?? '-'}`}
        onRequestClose={() => setIsQrModalVisible(false)}
      />

      <MessageDetailSheet
        visible={selectedNotice !== null}
        onRequestClose={() => setSelectedNotice(null)}
        icon={selectedNotice ? NOTICE_META[toNoticeType(selectedNotice.type)].icon : 'megaphone'}
        iconColor={selectedNotice ? NOTICE_META[toNoticeType(selectedNotice.type)].color : colors.primary}
        iconSurface={selectedNotice ? NOTICE_META[toNoticeType(selectedNotice.type)].surface : colors.primarySurface}
        title={selectedNotice?.title ?? ''}
        body={selectedNotice?.body ?? ''}
        metaLines={[
          selectedNotice?.created_by?.name ?? undefined,
          selectedNotice
            ? joinFields(
                formatRelativeTime(selectedNotice.published_at) ?? undefined,
                formatDateTime(selectedNotice.published_at) ?? undefined,
              )
            : undefined,
          selectedNotice?.scope_label ?? undefined,
        ]}
        action={{
          label: 'Lihat Semua Pengumuman',
          onPress: () => {
            setSelectedNotice(null);
            navigation.navigate(ROUTES.announcements);
          },
        }}
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
  // Padding + margin negatif penyeimbang di semua sisi: beri ruang buat shadow tile (cardShadow,
  // radius 20) yang kalau tidak, terpotong di tepi ScrollView horizontal (bawah + kiri).
  statusTilesScroll: {
    marginVertical: -10,
    marginHorizontal: -10,
  },
  statusTilesRow: {
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  assetCard: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
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
  emptyRow: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 16,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 6,
  },
  shortcutCell: {
    flex: 1,
  },
});
