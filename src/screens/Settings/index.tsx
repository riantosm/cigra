import { useCallback, useEffect, useState } from 'react';
import { AppState, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import Card from '@/components/molecules/Card';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch } from '@/store/hooks';
import { logout, logoutLocal } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';
import { isGpsEnabled, isLocationPermissionGranted, openAppSettings, openLocationSettings } from '@/utils/location';
import { isNotificationPermissionGranted } from '@/utils/pushNotifications';
import { appVersion } from '@/utils/version';

export type SettingsScreenProps = RootStackScreenProps<typeof ROUTES.settings>;

interface PermissionRowState {
  icon: IconName;
  title: string;
  description: string;
  granted: boolean | null;
  onOpenSettings: () => void;
}

export default function SettingsScreen(props: SettingsScreenProps) {
  const { navigation } = props;
  const dispatch = useAppDispatch();
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState<boolean | null>(null);
  const [notificationGranted, setNotificationGranted] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLogoutConfirmVisible, setIsLogoutConfirmVisible] = useState(false);

  const checkPermissions = useCallback(async () => {
    const [location, gps, notification] = await Promise.all([
      isLocationPermissionGranted(),
      isGpsEnabled(),
      isNotificationPermissionGranted(),
    ]);
    setLocationGranted(location);
    setGpsEnabled(gps);
    setNotificationGranted(notification);
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await checkPermissions();
    setIsRefreshing(false);
  }

  useEffect(() => {
    // Refresh status begitu user kembali dari halaman Settings OS.
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') checkPermissions();
    });
    return () => subscription.remove();
  }, [checkPermissions]);

  function performLogout() {
    setIsLogoutConfirmVisible(false);
    // Keluar dari UI langsung tanpa menunggu API — RequireAuth akan langsung
    // mengarahkan keluar dari layar ini begitu isLogin jadi false.
    dispatch(logoutLocal());
    // API logout + cleanup (token, tracking lokasi, push notif) tetap berjalan
    // di background, tidak diawait supaya tidak menahan transisi UI.
    dispatch(logout());
  }

  const rows: PermissionRowState[] = [
    {
      icon: 'map-pin',
      title: 'Izin Lokasi',
      description: 'Diperlukan untuk pelacakan posisi dan sinyal darurat.',
      granted: locationGranted,
      onOpenSettings: openAppSettings,
    },
    {
      icon: 'crosshair',
      title: 'Status GPS',
      description: 'Layanan lokasi perangkat harus aktif agar posisi bisa dideteksi.',
      granted: gpsEnabled,
      onOpenSettings: openLocationSettings,
    },
    {
      icon: 'bell',
      title: 'Izin Notifikasi',
      description: 'Diperlukan agar peringatan darurat dapat ditampilkan.',
      granted: notificationGranted,
      onOpenSettings: openAppSettings,
    },
  ];

  return (
    <MainLayout title="Pengaturan" onBack={() => navigation.goBack()}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }>
        <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={contentEnterTransition}>
          <Text style={styles.sectionTitle}>Status Izin Aplikasi</Text>

          <Card style={styles.card}>
            {rows.map((row, index) => (
              <View key={row.title} style={[styles.row, index === rows.length - 1 && styles.rowLast]}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowIcon}>
                    <Icon name={row.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowDescription}>{row.description}</Text>
                  </View>
                  {row.granted !== null ? (
                    <View style={[styles.statusBadge, row.granted ? styles.statusBadgeOn : styles.statusBadgeOff]}>
                      <Text style={[styles.statusLabel, { color: row.granted ? colors.success : colors.danger }]}>
                        {row.granted ? 'Aktif' : 'Nonaktif'}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {row.granted === false ? (
                  <Button
                    label="Buka Pengaturan"
                    variant="secondary"
                    onPress={row.onOpenSettings}
                    style={styles.rowAction}
                  />
                ) : null}
              </View>
            ))}
          </Card>

          <Button
            label="Logout"
            variant="danger"
            style={styles.logout}
            onPress={() => setIsLogoutConfirmVisible(true)}
          />

          <Text style={styles.version}>v{appVersion}</Text>
        </MotiView>
      </ScrollView>

      <StatusModal
        visible={isLogoutConfirmVisible}
        variant="error"
        title="Keluar dari Aplikasi?"
        message="Anda perlu login kembali untuk melanjutkan pelacakan lokasi dan fitur lainnya."
        onRequestClose={() => setIsLogoutConfirmVisible(false)}
        primaryAction={{ label: 'Logout', variant: 'danger', onPress: performLogout }}
        secondaryAction={{ label: 'Batal', onPress: () => setIsLogoutConfirmVisible(false) }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  card: {
    paddingVertical: 4,
  },
  row: {
    gap: 10,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  rowDescription: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeOn: {
    backgroundColor: colors.successSurface,
  },
  statusBadgeOff: {
    backgroundColor: colors.dangerSurface,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  rowAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logout: {
    marginTop: 24,
  },
  version: {
    marginTop: 16,
    alignSelf: 'center',
    fontSize: 12,
    color: colors.textMuted,
  },
});
