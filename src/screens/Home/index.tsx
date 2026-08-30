import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import StatusModal from '@/components/organisms/StatusModal';
import CommanderHome from '@/screens/Home/CommanderHome';
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

// Dashboard "komandan" (CommanderHome) cuma buat role ini — role lain (mis. 'anggota') masih pakai
// tampilan Home yang lebih sederhana (MemberHome) sampai desainnya sendiri dibuatkan nanti.
const COMMANDER_ROLE = 'komandan';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<HomeNavigationProp>();
  const user = useAppSelector(state => state.auth.user);
  useDoubleBackToExit();
  const [locationIssue, setLocationIssue] = useState<{ reason: LocationErrorReason; message: string } | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([ensureLocationReady(), dispatch(refreshUser())]);
    setIsRefreshing(false);
  }

  const isGpsIssue = locationIssue?.reason === 'gps-disabled';
  const isCommander = user?.roles?.includes(COMMANDER_ROLE) ?? false;

  return (
    <>
      {isCommander ? (
        <CommanderHome user={user} navigation={navigation} isRefreshing={isRefreshing} onRefresh={handleRefresh} />
      ) : (
        <MemberHome user={user} navigation={navigation} isRefreshing={isRefreshing} onRefresh={handleRefresh} />
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
