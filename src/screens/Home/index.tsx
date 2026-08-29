import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshUser } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';
import {
  LocationUnavailableError,
  getCurrentCoordinates,
  openAppSettings,
  openLocationSettings,
} from '@/utils/location';
import type { LocationErrorReason } from '@/utils/location';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const [locationIssue, setLocationIssue] = useState<{ reason: LocationErrorReason; message: string } | null>(
    null,
  );

  const ensureLocationReady = useCallback(async () => {
    try {
      await getCurrentCoordinates();
      setLocationIssue(null);
    } catch (error) {
      if (error instanceof LocationUnavailableError) {
        setLocationIssue({ reason: error.reason, message: error.message });
      }
    }
  }, []);

  useEffect(() => {
    ensureLocationReady();
    // Home tidak pernah manggil API lain — pastikan sesi tetap divalidasi/di-refresh di sini juga,
    // bukan cuma menunggu layar lain yang kebetulan manggil API.
    dispatch(refreshUser());
  }, [dispatch, ensureLocationReady]);

  useEffect(() => {
    // Pengguna biasanya mengaktifkan izin/GPS lewat Settings lalu kembali ke app —
    // cek ulang saat app kembali aktif supaya popup langsung tertutup tanpa perlu aksi lain.
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        ensureLocationReady();
        dispatch(refreshUser());
      }
    });
    return () => subscription.remove();
  }, [dispatch, ensureLocationReady]);

  const isGpsIssue = locationIssue?.reason === 'gps-disabled';

  return (
    <MainLayout title="Home">
      <View style={styles.container}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={contentEnterTransition}
          style={styles.content}>
          <Text style={styles.title}>Welcome, {user?.name ?? 'User'} 👋</Text>
          <Text style={styles.subtitle}>Selamat datang di Smart Battalion</Text>
        </MotiView>
      </View>

      <StatusModal
        visible={locationIssue !== null}
        variant="error"
        title={isGpsIssue ? 'Aktifkan Lokasi' : 'Izin Lokasi Diperlukan'}
        message={locationIssue?.message ?? ''}
        onRequestClose={() => {}}
        primaryAction={
          isGpsIssue
            ? { label: 'Buka Pengaturan Lokasi', onPress: openLocationSettings }
            : { label: 'Izinkan Lagi', onPress: ensureLocationReady }
        }
        secondaryAction={isGpsIssue ? undefined : { label: 'Buka Pengaturan', onPress: openAppSettings }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 96,
  },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
