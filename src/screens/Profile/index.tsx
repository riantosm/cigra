import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import Badge from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import Card from '@/components/molecules/Card';
import FamilyMemberRow from '@/components/molecules/FamilyMemberRow';
import InfoRow from '@/components/molecules/InfoRow';
import LocationStatusBadge from '@/components/molecules/LocationStatusBadge';
import SectionCard from '@/components/molecules/SectionCard';
import StatusModal from '@/components/organisms/StatusModal';
import type { StatusModalAction, StatusModalVariant } from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getMyLocationApi, sendLocationApi } from '@/services/api/location.service';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshUser } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';
import { smallButtonShadow } from '@/theme/shadows';
import type { MyLocationResult } from '@/types';
import { isDisplayablePhoto } from '@/utils/avatar';
import { extractErrorMessage, formatBirth, formatDateShort, formatDateTime, genderLabel, joinFields, orDash, titleCase } from '@/utils/format';
import { contentEnterTransition } from '@/utils/motion';
import { getCurrentCoordinates, LocationUnavailableError, openAppSettings, openLocationSettings } from '@/utils/location';

export type ProfileScreenProps = RootStackScreenProps<typeof ROUTES.profile>;

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

export default function ProfileScreen(props: ProfileScreenProps) {
  const { navigation } = props;
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const [myLocation, setMyLocation] = useState<MyLocationResult | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modal, setModal] = useState<StatusModalState>(closedModalState);
  const [photoFailed, setPhotoFailed] = useState(false);
  const coords = myLocation?.location ?? null;
  const personnel = user?.personnel;
  const family = user?.family ?? [];
  const photoPath = personnel?.photo;
  const isActive = personnel ? personnel.status === 'active' : (user?.is_active ?? true);

  function closeModal() {
    setModal(closedModalState());
  }

  const loadLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    try {
      const result = await getMyLocationApi();
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
      subtitle="Data akun & identitas"
      variant="canvas"
      onBack={() => navigation.goBack()}
      right={
        <PressableScale
          onPress={() => navigation.navigate(ROUTES.settings)}
          hitSlop={12}
          contentStyle={styles.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Pengaturan">
          <Icon name="settings" size={20} color={colors.primary} />
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
              {isDisplayablePhoto(photoPath) && !photoFailed ? (
                <SecureImage
                  path={photoPath}
                  style={styles.avatarImage}
                  onLoadError={() => setPhotoFailed(true)}
                />
              ) : (
                <GradientAvatar
                  label={(user?.name ?? 'U').charAt(0).toUpperCase()}
                  gradientStart={colors.gradientPrimaryStart}
                  gradientEnd={colors.gradientPrimaryEnd}
                  size={72}
                />
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

          {family.length ? (
            <SectionCard icon="users" title="Keluarga (Persit)">
              {family.map(member => (
                <FamilyMemberRow
                  key={member.id}
                  style={styles.familyRow}
                  name={member.full_name}
                  photo={member.photo_url ?? member.photo}
                  subtitle={joinFields(
                    member.family_relation ? titleCase(member.family_relation) : undefined,
                    member.membership_number ?? undefined,
                    member.occupation && member.occupation !== '-' ? member.occupation : undefined,
                  )}
                  onPress={() =>
                    navigation.navigate(ROUTES.meFamilyDetail, {
                      id: member.id,
                      name: member.full_name,
                    })
                  }
                />
              ))}
            </SectionCard>
          ) : null}

          {user?.roles?.length ? (
            <SectionCard icon="shield-check" title="Peran & Akses">
              <View style={styles.accessBlock}>
                <Text style={styles.accessLabel}>Peran (Role)</Text>
                <View style={styles.chipRow}>
                  {user.roles.map(role => (
                    <Badge key={role} label={role} variant="primary" />
                  ))}
                </View>
              </View>
            </SectionCard>
          ) : null}

          <Card style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <View style={styles.locationTitleGroup}>
                <Icon name="map-pin" size={18} color={colors.primary} />
                <Text style={styles.locationTitle}>Posisi Saya</Text>
              </View>
              <PressableScale
                onPress={handleManualUpdate}
                disabled={isUpdatingLocation}
                hitSlop={8}
                contentStyle={styles.refreshButton}>
                {isUpdatingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Icon name="refresh" size={15} color={colors.primary} />
                )}
              </PressableScale>
            </View>

            {myLocation ? (
              <LocationStatusBadge status={myLocation.status} timestamp={coords?.captured_at} />
            ) : null}

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
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...smallButtonShadow,
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
  avatarImage: {
    height: 72,
    width: 72,
    borderRadius: 36,
    backgroundColor: colors.neutralSurface,
  },
  identity: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.heading,
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
    borderBottomColor: colors.borderSoft,
    gap: 8,
  },
  familyRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
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
  refreshButton: {
    height: 30,
    width: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
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
});
