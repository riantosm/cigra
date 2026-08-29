import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MotiView } from 'moti';

import Badge from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import InfoRow from '@/components/molecules/InfoRow';
import SectionCard from '@/components/molecules/SectionCard';
import StatusModal from '@/components/organisms/StatusModal';
import type { StatusModalAction, StatusModalVariant } from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { MainTabScreenProps, RootStackParamList } from '@/navigation/types';
import { getMyLocationApi, sendLocationApi } from '@/services/api/location.service';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshUser } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';
import type { LocationStatus, MyLocationResult } from '@/types';
import { extractErrorMessage, formatBirth, formatDateShort, formatDateTime, genderLabel, orDash } from '@/utils/format';
import { contentEnterTransition, pressTransition } from '@/utils/motion';
import { getCurrentCoordinates, LocationUnavailableError, openAppSettings, openLocationSettings } from '@/utils/location';

type ProfileNavigationProp = CompositeNavigationProp<
  MainTabScreenProps<'Profile'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

const statusLabel: Record<LocationStatus, string> = {
  fresh: 'Aktif',
  stale: 'Tertunda',
  offline: 'Offline',
};

const statusColor: Record<LocationStatus, string> = {
  fresh: colors.success,
  stale: colors.warning,
  offline: colors.danger,
};

interface StatusModalState {
  visible: boolean;
  variant: StatusModalVariant;
  title: string;
  message: string;
  primaryAction: StatusModalAction;
  secondaryAction?: StatusModalAction;
}

function closedModalState(): StatusModalState {
  return {
    visible: false,
    variant: 'success',
    title: '',
    message: '',
    primaryAction: { label: 'OK', onPress: () => {} },
    secondaryAction: undefined,
  };
}

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigationProp>();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const [myLocation, setMyLocation] = useState<MyLocationResult | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modal, setModal] = useState<StatusModalState>(closedModalState);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [permissionsExpanded, setPermissionsExpanded] = useState(false);
  const coords = myLocation?.location ?? null;
  const personnel = user?.personnel;
  const isActive = personnel ? personnel.status === 'active' : (user?.is_active ?? true);

  function closeModal() {
    setModal(closedModalState());
  }

  const loadLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    try {
      const result = await getMyLocationApi();
      console.log('getMyLocationApi', result);
      setMyLocation(result);
    } catch {
      setMyLocation(null);
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([dispatch(refreshUser()), loadLocation()]);
    setIsRefreshing(false);
  }

  function openInMaps() {
    if (!coords) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`);
  }

  async function handleManualUpdate() {
    if (isUpdatingLocation) return;
    setIsUpdatingLocation(true);
    try {
      const { latitude, longitude } = await getCurrentCoordinates();
      const payload = { latitude, longitude, source: 'mobile' };
      console.log('sendLocationApi payload', payload);
      const result = await sendLocationApi(payload);
      console.log('sendLocationApi result', result);
      await loadLocation();
    } catch (error) {
      console.log('sendLocationApi error', error);
      if (error instanceof LocationUnavailableError) {
        const isGpsIssue = error.reason === 'gps-disabled';
        setModal({
          visible: true,
          variant: 'error',
          title: isGpsIssue ? 'Aktifkan Lokasi' : 'Izin Lokasi Diperlukan',
          message: error.message,
          primaryAction: { label: 'OK', onPress: closeModal },
          secondaryAction: {
            label: isGpsIssue ? 'Buka Pengaturan Lokasi' : 'Buka Pengaturan',
            onPress: isGpsIssue ? openLocationSettings : openAppSettings,
          },
        });
      } else {
        setModal({
          visible: true,
          variant: 'error',
          title: 'Gagal Memperbarui',
          message: extractErrorMessage(error, 'Posisi gagal diperbarui.'),
          primaryAction: { label: 'OK', onPress: closeModal },
        });
      }
    } finally {
      setIsUpdatingLocation(false);
    }
  }

  return (
    <MainLayout
      title="Profile"
      right={
        <PressableScale
          onPress={() => navigation.navigate(ROUTES.settings)}
          hitSlop={12}
          contentStyle={styles.settingsButton}
          accessibilityRole="button"
          accessibilityLabel="Pengaturan">
          <Icon name="settings" size={22} color={colors.text} />
        </PressableScale>
      }>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }>
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}>
          <Card style={styles.card}>
            <View style={styles.identityRow}>
              {personnel?.photo && !photoFailed ? (
                <Image
                  source={{ uri: personnel.photo }}
                  style={styles.avatarImage}
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarLabel}>{(user?.name ?? 'U').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.identity}>
                <Text style={styles.name}>{user?.name ?? '-'}</Text>
                <Badge label={isActive ? 'AKTIF' : 'NONAKTIF'} variant={isActive ? 'success' : 'neutral'} />
                <View style={styles.identityMeta}>
                  <View style={styles.identityMetaRow}>
                    <Icon name="id-card" size={14} color={colors.textMuted} />
                    <Text style={styles.identityMetaText}>{user?.username ?? '-'}</Text>
                  </View>
                  <View style={styles.identityMetaRow}>
                    <Icon name="mail" size={14} color={colors.textMuted} />
                    <Text style={styles.identityMetaText} numberOfLines={1}>
                      {user?.email ?? '-'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>

          {personnel ? (
            <SectionCard icon="profile" title="Data Personel">
              <InfoRow icon="profile" label="Nama Lengkap" value={orDash(personnel.full_name)} />
              <InfoRow icon="id-card" label="Nomor Dinas" value={orDash(personnel.service_number)} />
              <InfoRow icon="rank" label="Pangkat" value={orDash(personnel.rank)} />
              <InfoRow
                icon="cake"
                label="Tempat, Tanggal Lahir"
                value={formatBirth(personnel.birth_place, personnel.birth_date_formatted)}
              />
              <InfoRow icon="blood-drop" label="Golongan Darah" value={orDash(personnel.blood_type)} />
              <InfoRow icon="profile" label="Jenis Kelamin" value={genderLabel(personnel.gender)} />
              <InfoRow icon="map-pin" label="Alamat" value={orDash(personnel.address)} />
              <InfoRow icon="phone" label="No. Telepon" value={orDash(personnel.phone)} />
            </SectionCard>
          ) : null}

          {personnel?.current_assignment ? (
            <SectionCard icon="briefcase" title="Penugasan Saat Ini">
              <InfoRow icon="briefcase" label="Jabatan" value={orDash(personnel.current_assignment.position)} />
              <InfoRow icon="building" label="Satuan" value={orDash(personnel.current_assignment.unit)} />
              <InfoRow icon="calendar" label="Sejak" value={formatDateShort(personnel.current_assignment.start_date)} />
            </SectionCard>
          ) : null}

          {(user?.roles?.length || user?.permissions?.length) ? (
            <SectionCard icon="shield-check" title="Peran & Akses">
              {user?.roles?.length ? (
                <View style={styles.accessBlock}>
                  <Text style={styles.accessLabel}>Peran (Role)</Text>
                  <View style={styles.chipRow}>
                    {user.roles.map(role => (
                      <Badge key={role} label={role} variant="primary" />
                    ))}
                  </View>
                </View>
              ) : null}
              {user?.permissions?.length ? (
                <View style={styles.accessBlock}>
                  <PressableScale
                    contentStyle={styles.accordionHeader}
                    hitSlop={8}
                    onPress={() => setPermissionsExpanded(value => !value)}>
                    <Text style={styles.accessLabel}>Izin Akses (Permissions) · {user.permissions.length}</Text>
                    <MotiView animate={{ rotate: permissionsExpanded ? '180deg' : '0deg' }} transition={pressTransition}>
                      <Icon name="chevron-down" size={16} color={colors.textMuted} />
                    </MotiView>
                  </PressableScale>
                  {permissionsExpanded ? (
                    <MotiView
                      from={{ opacity: 0, translateY: -4 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={pressTransition}
                      style={styles.chipRow}>
                      {user.permissions.map(permission => (
                        <Badge key={permission} label={permission} variant="primary" />
                      ))}
                    </MotiView>
                  ) : null}
                </View>
              ) : null}
            </SectionCard>
          ) : null}

          <Card style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <View style={styles.locationTitleGroup}>
                <Icon name="map-pin" size={18} color={colors.primary} />
                <Text style={styles.locationTitle}>Posisi Saya</Text>
              </View>
              <View style={styles.locationHeaderActions}>
                {myLocation ? (
                  <View style={[styles.statusBadge, { backgroundColor: statusColor[myLocation.status] }]}>
                    <Text style={styles.statusBadgeLabel}>{statusLabel[myLocation.status]}</Text>
                  </View>
                ) : null}
                <PressableScale
                  onPress={handleManualUpdate}
                  disabled={isUpdatingLocation}
                  hitSlop={8}
                  contentStyle={styles.refreshButton}>
                  {isUpdatingLocation ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.refreshGlyph}>⟳</Text>
                  )}
                </PressableScale>
              </View>
            </View>

            {isLoadingLocation ? (
              <Text style={styles.locationMuted}>Memuat posisi...</Text>
            ) : coords ? (
              <PressableScale onPress={openInMaps}>
                <Text style={styles.coordinates}>
                  {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                </Text>
                {formatDateTime(coords.captured_at) ? (
                  <Text style={styles.locationUpdatedAt}>
                    Terakhir diperbarui: {formatDateTime(coords.captured_at)}
                  </Text>
                ) : null}
                <Text style={styles.locationMuted}>Ketuk untuk buka di Google Maps</Text>
              </PressableScale>
            ) : (
              <Text style={styles.locationMuted}>Posisi belum tersedia.</Text>
            )}
          </Card>
        </MotiView>
      </ScrollView>

      <StatusModal
        visible={modal.visible}
        variant={modal.variant}
        title={modal.title}
        message={modal.message}
        onRequestClose={closeModal}
        primaryAction={modal.primaryAction}
        secondaryAction={modal.secondaryAction}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 96,
    paddingTop: 24,
  },
  card: {
    paddingVertical: 20,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatar: {
    height: 72,
    width: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarImage: {
    height: 72,
    width: 72,
    borderRadius: 36,
    backgroundColor: colors.neutralSurface,
  },
  avatarLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  identity: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  identityMeta: {
    marginTop: 4,
    gap: 6,
  },
  identityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  identityMetaText: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  accessBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  accessLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationCard: {
    marginTop: 16,
    gap: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  refreshButton: {
    height: 28,
    width: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  refreshGlyph: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  coordinates: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  locationUpdatedAt: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  locationMuted: {
    fontSize: 13,
    color: colors.textMuted,
  },
  settingsButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
});
