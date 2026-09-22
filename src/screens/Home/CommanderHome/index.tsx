import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import ScreenBackground from '@/components/atoms/ScreenBackground';
import SyncStrip from '@/components/molecules/SyncStrip';
import MessageDetailSheet from '@/components/organisms/MessageDetailSheet';
import PersonnelMap from '@/components/organisms/PersonnelMap';
import ActivityRow from '@/screens/Home/ActivityRow';
import AnnouncementRow from '@/screens/Home/AnnouncementRow';
import HomeHeader from '@/screens/Home/HomeHeader';
import HomeWeatherWidget from '@/screens/Home/HomeWeatherWidget';
import type { HomeWeatherWidgetHandle } from '@/screens/Home/HomeWeatherWidget';
import QuickActionButton from '@/screens/Home/QuickActionButton';
import type { QuickActionButtonProps } from '@/screens/Home/QuickActionButton';
import QuickActionSheet from '@/screens/Home/QuickActionSheet';
import SituationHeroCard from '@/screens/Home/SituationHeroCard';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { ROUTES } from '@/navigation/paths';
import type { MainTabScreenProps, RootStackParamList } from '@/navigation/types';
import { getActivityMovementsApi } from '@/services/api/activity.service';
import { getDashboardSituationApi } from '@/services/api/dashboard.service';
import { getLocationsOverviewApi } from '@/services/api/location.service';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { cardShadow, ctaPrimaryShadow, smallButtonShadow } from '@/theme/shadows';
import { contentEnterTransition } from '@/utils/motion';
import { cleanValue, formatDateTime, formatRelativeTime, joinFields } from '@/utils/format';
import type {
  ActivityMovement,
  Announcement,
  AuthUser,
  DashboardSituation,
  PersonnelLocationOverviewItem,
  SituationSummaryItem,
} from '@/types';
import type { IconName } from '@/components/atoms/Icon';

export type CommanderHomeNavigationProp = CompositeNavigationProp<
  MainTabScreenProps<'Home'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

export interface CommanderHomeProps {
  user: AuthUser | null;
  navigation: CommanderHomeNavigationProp;
  onRefresh: () => Promise<void>;
}

// Ikon + warna kartu "Ringkasan Situasi" per-key dari GET /dashboard/situation `summary[]`.
const SITUATION_META: Record<string, { icon: IconName; color: string }> = {
  at_base: { icon: 'shield-check', color: colors.success },
  off_base: { icon: 'map-pin', color: colors.warning },
  absent: { icon: 'alert-triangle', color: colors.danger },
  on_leave: { icon: 'calendar', color: colors.primary },
};

interface SituationStat {
  icon: IconName;
  label: string;
  value: string;
  meta: string;
  percent: number;
  color: string;
}

function toSituationStats(data: DashboardSituation | null): SituationStat[] {
  if (!data) return [];
  const total: SituationStat = {
    icon: 'users',
    label: 'Total Personel',
    value: String(data.total_personnel),
    meta: '100%',
    percent: 100,
    color: colors.primary,
  };
  const rest = (data.summary ?? []).map((item: SituationSummaryItem): SituationStat => {
    const meta = SITUATION_META[item.key] ?? { icon: 'users' as IconName, color: colors.primary };
    return {
      icon: meta.icon,
      label: item.label,
      value: String(item.count),
      meta: `${item.percent}%`,
      percent: item.percent,
      color: meta.color,
    };
  });
  return [total, ...rest].slice(0, 4);
}

// Samakan dengan halaman "Pengumuman" (screens/Announcements). `gradient` = pasangan token
// gradient yang sudah ada di colors.ts (DESIGN_SYSTEM.md "Aksen Gradient") — dipakai chip ikon.
const ANNOUNCEMENT_META: Record<string, { icon: IconName; color: string; surface: string; gradient: readonly [string, string] }> = {
  alert: { icon: 'alert-triangle', color: colors.danger, surface: colors.dangerSurface, gradient: [colors.gradientDangerStart, colors.danger] },
  announcement: { icon: 'megaphone', color: colors.warning, surface: colors.chipSurface, gradient: [colors.gradientWarnStart, colors.warning] },
  info: { icon: 'info', color: colors.primary, surface: colors.primarySurface, gradient: [colors.gradientPrimaryStart, colors.gradientPrimaryEnd] },
};

function announcementMeta(type: string) {
  return ANNOUNCEMENT_META[type] ?? ANNOUNCEMENT_META.announcement;
}

// Chip ikon gradient arah pergerakan (Aktivitas Terbaru) — hijau utk masuk, amber utk keluar.
const DIRECTION_GRADIENT: Record<'in' | 'out', readonly [string, string]> = {
  in: [colors.gradientSuccessStart, colors.success],
  out: [colors.gradientWarnStart, colors.warning],
};

function movementDetail(item: ActivityMovement): string {
  const head = cleanValue(item.note) ?? (item.direction === 'out' ? 'Keluar Markas' : 'Masuk Markas');
  return joinFields(head, item.purpose, item.location_label);
}

// Grid Home = 2 baris x 4 kartu: 7 quick action pertama + kartu "Lainnya" (bottom sheet berisi
// sisanya). "Kekuatan Apel" (index 3, role instruktur apel saja) + "Patroli" (semua komandan)
// menggeser kartu di ekornya ("Distribusi Senjata", dst.) ke dalam sheet "Lainnya".
const VISIBLE_QUICK_ACTION_COUNT = 7;

export default function CommanderHome(props: CommanderHomeProps) {
  const { user, navigation, onRefresh } = props;
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQuickActionSheetVisible, setIsQuickActionSheetVisible] = useState(false);
  const weatherRef = useRef<HomeWeatherWidgetHandle>(null);
  const [personnelLocations, setPersonnelLocations] = useState<PersonnelLocationOverviewItem[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [situation, setSituation] = useState<DashboardSituation | null>(null);
  const [isLoadingSituation, setIsLoadingSituation] = useState(true);
  const [movements, setMovements] = useState<ActivityMovement[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<Announcement | null>(null);

  const announcements = useAppSelector(state => state.announcements.items);

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

  const loadDashboard = useCallback(async () => {
    const [situationResult, movementsResult] = await Promise.allSettled([
      getDashboardSituationApi(),
      getActivityMovementsApi({ per_page: 3 }),
    ]);
    if (situationResult.status === 'fulfilled') setSituation(situationResult.value);
    if (movementsResult.status === 'fulfilled') setMovements(movementsResult.value.items);
    setIsLoadingSituation(false);
  }, []);

  useEffect(() => {
    loadPersonnelLocations();
    loadDashboard();
  }, [loadPersonnelLocations, loadDashboard]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await Promise.all([
        onRefresh(),
        loadPersonnelLocations(),
        loadDashboard(),
        weatherRef.current?.reload(),
      ]);
      setLastSyncedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }

  const situationStats = toSituationStats(situation);
  const recentActivity = movements.slice(0, 3);
  const recentAnnouncements = announcements.slice(0, 3);

  const syncedLabel = lastSyncedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const bottomPadding = useTabScreenBottomPadding();

  // "Kekuatan Apel" hanya untuk user dengan role instruktur apel (backend juga menegakkan 403).
  const canManageRollCall = (user?.roles ?? []).includes('instruktur_apel');

  // Urutan grid (7 pertama tampil + kartu "Lainnya" untuk sisanya). "Kekuatan Apel" hanya
  // disisipkan (slot ke-4) untuk role instruktur apel — saat tampil, "Distribusi Senjata"
  // bergeser ke dalam sheet "Lainnya".
  const quickActions: QuickActionButtonProps[] = [
    {
      icon: 'profile',
      label: 'Distribusi Personel',
      color: colors.primary,
      gradientColors: [colors.gradientPersonnelStart, colors.gradientPersonnelEnd],
      onPress: () => navigation.navigate(ROUTES.catalogList, { resource: 'personnel' }),
    },
    {
      icon: 'users',
      label: 'Keluarga (Persit)',
      color: colors.gradientFamilyEnd,
      gradientColors: [colors.gradientFamilyStart, colors.gradientFamilyEnd],
      onPress: () => navigation.navigate(ROUTES.catalogList, { resource: 'persit' }),
    },
    {
      icon: 'megaphone',
      label: 'Kirim Pengumuman',
      color: colors.warning,
      gradientColors: [colors.gradientWarnStart, colors.warning],
      onPress: () => navigation.navigate(ROUTES.sendAnnouncement),
    },
    ...(canManageRollCall
      ? [
          {
            icon: 'clipboard-check' as const,
            label: 'Kekuatan Apel',
            color: colors.primary,
            gradientColors: [colors.gradientPersonnelStart, colors.gradientPersonnelEnd] as const,
            onPress: () => navigation.navigate(ROUTES.rollCallList),
          },
        ]
      : []),
    {
      icon: 'route',
      label: 'Monitoring Patroli',
      color: colors.success,
      gradientColors: [colors.gradientSuccessStart, colors.success],
      onPress: () => navigation.navigate(ROUTES.patrolMonitoring),
    },
    {
      icon: 'mail',
      label: 'Disposisi Surat',
      color: colors.primary,
      gradientColors: [colors.gradientPersonnelStart, colors.gradientPersonnelEnd],
      onPress: () => navigation.navigate(ROUTES.incomingLetterList),
    },
    {
      icon: 'map-pin',
      label: 'Peta Personel',
      color: colors.success,
      gradientColors: [colors.gradientSuccessStart, colors.success],
      onPress: () => navigation.navigate(ROUTES.personnelTracking),
    },
    {
      icon: 'car',
      label: 'Kendaraan',
      color: colors.gradientEntryStart,
      gradientColors: [colors.gradientEntryStart, colors.gradientEntryEnd],
      onPress: () => navigation.navigate(ROUTES.catalogList, { resource: 'vehicles' }),
    },
    {
      icon: 'weapon',
      label: 'Kategori Senjata',
      color: colors.gradientWeaponStart,
      gradientColors: [colors.gradientWeaponStart, colors.gradientWeaponEnd],
      onPress: () => navigation.navigate(ROUTES.catalogList, { resource: 'weapon-categories' }),
    },
    {
      icon: 'weapon',
      label: 'Distribusi Senjata',
      color: colors.gradientHealthStart,
      gradientColors: [colors.gradientHealthStart, colors.gradientHealthEnd],
      onPress: () => navigation.navigate(ROUTES.catalogList, { resource: 'weapon-assignments' }),
    },
    {
      icon: 'emergency',
      label: 'Alarm Satuan',
      color: colors.gradientWeaponStart,
      gradientColors: [colors.gradientWeaponStart, colors.gradientWeaponEnd],
      onPress: () => navigation.navigate(ROUTES.alarmSatuan),
    },
    {
      icon: 'handbook',
      label: 'Buku Saku',
      color: colors.primary,
      gradientColors: [colors.gradientPersonnelStart, colors.gradientPersonnelEnd],
      onPress: () => navigation.navigate(ROUTES.bukuSaku),
    },
  ];
  const gridActions: QuickActionButtonProps[] = [
    ...quickActions.slice(0, VISIBLE_QUICK_ACTION_COUNT),
    {
      icon: 'grid',
      label: 'Lainnya',
      color: colors.primary,
      gradientColors: [colors.gradientPersonnelStart, colors.gradientPersonnelEnd],
      onPress: () => setIsQuickActionSheetVisible(true),
    },
  ];
  const quickActionRows: QuickActionButtonProps[][] = [];
  for (let i = 0; i < gridActions.length; i += 4) {
    quickActionRows.push(gridActions.slice(i, i + 4));
  }

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

          <HomeWeatherWidget ref={weatherRef} style={styles.weatherWidget} />

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
                    gradientColors={action.gradientColors}
                    onPress={action.onPress}
                    style={styles.quickActionCell}
                  />
                ))}
                {Array.from({ length: 4 - row.length }).map((_, spacerIndex) => (
                  <View key={`spacer-${spacerIndex}`} style={styles.quickActionCell} />
                ))}
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ringkasan Situasi</Text>
          </View>
          {isLoadingSituation && situationStats.length === 0 ? (
            <View style={styles.listCard}>
              <Text style={styles.emptyRow}>Memuat ringkasan situasi...</Text>
            </View>
          ) : situationStats.length === 0 ? (
            <View style={styles.listCard}>
              <Text style={styles.emptyRow}>Ringkasan situasi belum tersedia.</Text>
            </View>
          ) : (
            <SituationHeroCard
              total={situationStats[0]?.value ?? '0'}
              stats={situationStats.slice(1)}
              activeAlerts={situation?.active_alerts ?? 0}
              onPressAlerts={() => navigation.navigate(ROUTES.emergencyList)}
              style={styles.situationHero}
            />
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
            <PressableScale onPress={() => navigation.navigate(ROUTES.activityMovements)}>
              <Text style={styles.sectionLink}>Lihat Semua</Text>
            </PressableScale>
          </View>
          <View style={styles.listCard}>
            {recentActivity.length === 0 ? (
              <Text style={styles.emptyRow}>Belum ada aktivitas keluar/masuk.</Text>
            ) : (
              recentActivity.map((movement, index) => (
                <PressableScale
                  key={movement.id}
                  scaleTo={0.98}
                  style={index < recentActivity.length - 1 ? styles.listRowDivider : undefined}
                  onPress={() =>
                    navigation.navigate(ROUTES.catalogDetail, {
                      resource: 'personnel',
                      id: movement.personnel.service_number,
                      initialTab: 'visitor',
                    })
                  }>
                  <ActivityRow
                    name={joinFields(movement.personnel.rank, movement.personnel.full_name) || movement.personnel.full_name}
                    detail={movementDetail(movement)}
                    time={formatRelativeTime(movement.occurred_at) ?? '-'}
                    direction={movement.direction === 'out' ? 'out' : 'in'}
                    gradientColors={DIRECTION_GRADIENT[movement.direction === 'out' ? 'out' : 'in']}
                  />
                </PressableScale>
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
            {recentAnnouncements.length === 0 ? (
              <Text style={styles.emptyRow}>Belum ada pengumuman.</Text>
            ) : (
              recentAnnouncements.map((item, index, shown) => {
                const meta = announcementMeta(item.type);
                return (
                  <PressableScale
                    key={item.id}
                    scaleTo={0.98}
                    style={index < shown.length - 1 ? styles.listRowDivider : undefined}
                    onPress={() => setSelectedNotice(item)}>
                    <AnnouncementRow
                      icon={meta.icon}
                      title={item.title}
                      detail={item.body}
                      sender={item.created_by?.name ?? 'Komando'}
                      time={formatRelativeTime(item.published_at) ?? '-'}
                      color={meta.color}
                      gradientColors={meta.gradient}
                    />
                  </PressableScale>
                );
              })
            )}
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
            <PressableScale
              scaleTo={0.98}
              onPress={() => navigation.navigate(ROUTES.personnelMap)}
              style={styles.mapRingOuter}
              contentStyle={styles.mapRingContent}
              accessibilityRole="button"
              accessibilityLabel="Lihat Peta Lengkap">
              <Svg style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="mapRing" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={colors.gradientPrimaryStart} />
                    <Stop offset="1" stopColor={colors.gradientPrimaryEnd} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" rx={18} fill="url(#mapRing)" />
              </Svg>
              <View style={styles.mapPreview}>
                <PersonnelMap personnel={personnelLocations} interactive={false} lite style={styles.mapPreviewMap} />
                <View style={styles.mapLegend}>
                  <View style={styles.mapLegendDot} />
                  <Text style={styles.mapLegendText}>
                    {personnelLocations.length}/{situation?.total_personnel ?? '-'} dipantau
                  </Text>
                </View>
                <View style={styles.mapPill}>
                  <Icon name="map-pin" size={14} color={colors.primaryForeground} />
                  <Text style={styles.mapPillText}>Peta Lengkap</Text>
                </View>
              </View>
            </PressableScale>
          )}
        </MotiView>
      </ScrollView>

      <QuickActionSheet
        visible={isQuickActionSheetVisible}
        actions={quickActions}
        onRequestClose={() => setIsQuickActionSheetVisible(false)}
      />

      <MessageDetailSheet
        visible={selectedNotice !== null}
        onRequestClose={() => setSelectedNotice(null)}
        icon={selectedNotice ? announcementMeta(selectedNotice.type).icon : 'megaphone'}
        iconColor={selectedNotice ? announcementMeta(selectedNotice.type).color : colors.primary}
        iconSurface={selectedNotice ? announcementMeta(selectedNotice.type).surface : colors.primarySurface}
        gradientColors={selectedNotice ? announcementMeta(selectedNotice.type).gradient : ANNOUNCEMENT_META.info.gradient}
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
    marginBottom: 20,
  },
  weatherWidget: {
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
  situationHero: {
    marginBottom: 24,
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
  emptyRow: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 16,
  },
  mapRingOuter: {
    marginBottom: 24,
  },
  mapRingContent: {
    padding: 2,
    borderRadius: 18,
    overflow: 'hidden',
  },
  mapPreview: {
    height: 176,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapPreviewMap: {
    flex: 1,
  },
  mapLegend: {
    position: 'absolute',
    left: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.floatingSurface,
    ...smallButtonShadow,
  },
  mapLegendDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  mapLegendText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.heading,
  },
  mapPill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
    ...ctaPrimaryShadow,
  },
  mapPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryForeground,
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
