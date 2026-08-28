import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import axios from 'axios';

import Button from '@/components/atoms/Button';
import Card from '@/components/molecules/Card';
import StatusModal from '@/components/organisms/StatusModal';
import type { StatusModalAction, StatusModalVariant } from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { getMyLocationApi, sendLocationApi } from '@/services/api/location.service';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, refreshUser } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';
import type { LocationStatus, MyLocationResult } from '@/types';
import { contentEnterTransition } from '@/utils/motion';
import { getCurrentCoordinates, LocationUnavailableError, openAppSettings, openLocationSettings } from '@/utils/location';

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

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

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
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const [myLocation, setMyLocation] = useState<MyLocationResult | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [modal, setModal] = useState<StatusModalState>(closedModalState);
  const coords = myLocation?.location ?? null;

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

  async function performLogout() {
    closeModal();
    setIsLoggingOut(true);
    await dispatch(logout());
    // Tidak perlu setIsLoggingOut(false) di sini — begitu isLogin jadi false,
    // RequireAuth langsung mengarahkan keluar dari layar ini.
  }

  function confirmLogout() {
    setModal({
      visible: true,
      variant: 'error',
      title: 'Keluar dari Aplikasi?',
      message: 'Anda perlu login kembali untuk melanjutkan pelacakan lokasi dan fitur lainnya.',
      primaryAction: { label: 'Logout', variant: 'danger', onPress: performLogout },
      secondaryAction: { label: 'Batal', onPress: closeModal },
    });
  }

  return (
    <MainLayout title="Profile">
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
            <View style={styles.avatar}>
              <Text style={styles.avatarLabel}>{(user?.name ?? 'U').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.identity}>
              <Text style={styles.name}>{user?.name ?? '-'}</Text>
              <Text style={styles.username}>@{user?.username ?? '-'}</Text>
            </View>
          </Card>

          <Card style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationTitle}>Posisi Saya</Text>
              <View style={styles.locationHeaderActions}>
                {myLocation ? (
                  <View style={[styles.statusBadge, { backgroundColor: statusColor[myLocation.status] }]}>
                    <Text style={styles.statusBadgeLabel}>{statusLabel[myLocation.status]}</Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={handleManualUpdate}
                  disabled={isUpdatingLocation}
                  hitSlop={8}
                  style={styles.refreshButton}>
                  {isUpdatingLocation ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.refreshGlyph}>⟳</Text>
                  )}
                </Pressable>
              </View>
            </View>

            {isLoadingLocation ? (
              <Text style={styles.locationMuted}>Memuat posisi...</Text>
            ) : coords ? (
              <Pressable onPress={openInMaps}>
                <Text style={styles.coordinates}>
                  {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                </Text>
                <Text style={styles.locationMuted}>Ketuk untuk buka di Google Maps</Text>
              </Pressable>
            ) : (
              <Text style={styles.locationMuted}>Posisi belum tersedia.</Text>
            )}
          </Card>

          <Button
            label="Logout"
            variant="danger"
            loading={isLoggingOut}
            style={styles.logout}
            onPress={confirmLogout}
          />
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
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  avatar: {
    height: 80,
    width: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  identity: {
    alignItems: 'center',
    gap: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  username: {
    fontSize: 14,
    color: colors.textMuted,
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
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
  locationMuted: {
    fontSize: 13,
    color: colors.textMuted,
  },
  logout: {
    marginTop: 24,
  },
});
