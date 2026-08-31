import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import StatusModal from '@/components/organisms/StatusModal';
import CommanderHome from '@/screens/Home/CommanderHome';
import HealthOfficerHome from '@/screens/Home/HealthOfficerHome';
import MemberHome from '@/screens/Home/MemberHome';
import { useDoubleBackToExit } from '@/hooks/useDoubleBackToExit';
import type { MainTabScreenProps, RootStackParamList } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshUser } from '@/store/slices/authSlice';
import {
  LocationUnavailableError,
  getCurrentCoordinates,
  openAppSettings,
  openLocationSettings,
} from '@/utils/location';
import type { LocationErrorReason } from '@/utils/location';

type HomeNavigationProp = CompositeNavigationProp<
  MainTabScreenProps<'Home'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

// Home dipilih berdasar role: komandan → CommanderHome (dashboard satuan), petugas_kesehatan →
// HealthOfficerHome (ringkasan + aksi cepat kesehatan), sisanya (anggota/prajurit) → MemberHome.
const COMMANDER_ROLE = 'komandan';
const HEALTH_OFFICER_ROLE = 'petugas_kesehatan';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<HomeNavigationProp>();
  const user = useAppSelector(state => state.auth.user);
  useDoubleBackToExit();
  const [locationIssue, setLocationIssue] = useState<{ reason: LocationErrorReason; message: string } | null>(
    null,
  );

  const ensureLocationReady = useCallback(async () => {
    try {
      // Gate ini cuma perlu tahu layanan lokasi memang berfungsi (bukan alur yang akurasinya
      // kritis seperti panic button), jadi izinkan fallback ke provider longgar kalau GPS lambat.
      await getCurrentCoordinates({ allowFallbackToLowAccuracy: true });
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

  // Cek GPS/izin lokasi bisa butuh puluhan detik (lihat komentar timeout di utils/location.ts),
  // jauh lebih lama dari API sesi sendiri — jangan diikutsertakan di sini supaya pull-to-refresh
  // di Home tidak "menggantung" menunggu GPS padahal API yang sebenarnya sudah selesai. Modal
  // status lokasi tetap ter-update lewat state `locationIssue` begitu pengecekan ini selesai,
  // cuma tidak ikut ditunggu oleh spinner refresh.
  const refreshSession = useCallback(async () => {
    ensureLocationReady();
    await dispatch(refreshUser());
  }, [dispatch, ensureLocationReady]);

  const isGpsIssue = locationIssue?.reason === 'gps-disabled';
  const roles = user?.roles ?? [];
  const isCommander = roles.includes(COMMANDER_ROLE);
  const isHealthOfficer = roles.includes(HEALTH_OFFICER_ROLE);

  return (
    <>
      {isCommander ? (
        <CommanderHome user={user} navigation={navigation} onRefresh={refreshSession} />
      ) : isHealthOfficer ? (
        <HealthOfficerHome user={user} navigation={navigation} onRefresh={refreshSession} />
      ) : (
        <MemberHome user={user} navigation={navigation} onRefresh={refreshSession} />
      )}

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
    </>
  );
}
