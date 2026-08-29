import { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MotiView } from 'moti';

import MenuCard from '@/components/molecules/MenuCard';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useDoubleBackToExit } from '@/hooks/useDoubleBackToExit';
import { ROUTES } from '@/navigation/paths';
import type { CatalogResourceKey, MainTabScreenProps, RootStackParamList } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshUser } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';
import { catalogResourceConfigs } from '@/utils/catalogResources';
import { contentEnterTransition } from '@/utils/motion';
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

const catalogMenuOrder: CatalogResourceKey[] = [
  'personnel',
  'persit',
  'vehicles',
  'weapon-categories',
  'weapon-assignments',
];

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

  const isGpsIssue = locationIssue?.reason === 'gps-disabled';

  return (
    <MainLayout title="Home">
      <ScrollView contentContainerStyle={styles.container}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={contentEnterTransition}
          style={styles.content}>
          <Text style={styles.title}>Welcome, {user?.name ?? 'User'} 👋</Text>
          <Text style={styles.subtitle}>Selamat datang di Smart Battalion</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}
          style={styles.grid}>
          {catalogMenuOrder.map(resource => {
            const config = catalogResourceConfigs[resource];
            return (
              <View key={resource} style={styles.gridItem}>
                <MenuCard
                  icon={config.icon}
                  title={config.menuTitle}
                  subtitle={config.menuSubtitle}
                  gradientStart={config.gradientStart}
                  gradientEnd={config.gradientEnd}
                  onPress={() => navigation.navigate(ROUTES.catalogList, { resource })}
                />
              </View>
            );
          })}
        </MotiView>
      </ScrollView>

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
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 96,
  },
  content: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    width: '47%',
  },
});
