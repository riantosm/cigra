import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logo } from '@/assets';
import AuthBackground from '@/components/atoms/AuthBackground';
import GradientButton from '@/components/atoms/GradientButton';
import PressableScale from '@/components/atoms/PressableScale';
import { useDoubleBackToExit } from '@/hooks/useDoubleBackToExit';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch } from '@/store/hooks';
import { appCheckCompleted, logout, logoutLocal, refreshUser } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';
import { authEnterTransition } from '@/utils/motion';
import { LocationUnavailableError, openAppSettings, startBackgroundLocationTracking } from '@/utils/location';

export type AppBootstrapScreenProps = RootStackScreenProps<typeof ROUTES.appBootstrap>;

type Phase = 'checking' | 'blocked';

// Perantara antara "API login sukses" dan Home. Loading di layar Login sekarang hanya untuk
// request /auth/login; sisa pekerjaan (sinkronisasi /auth/me + permintaan izin lokasi + start
// tracking latar belakang) dipindah ke sini supaya tidak menahan navigasi keluar dari Login.
// Tidak bisa di-back (dicapai lewat navigation.replace + gestureEnabled:false; hardware back
// Android → double-press keluar app lewat useDoubleBackToExit).
export default function AppBootstrapScreen(props: AppBootstrapScreenProps) {
  const { navigation } = props;
  const dispatch = useAppDispatch();
  useDoubleBackToExit();

  const [phase, setPhase] = useState<Phase>('checking');
  const [message, setMessage] = useState<string | null>(null);
  const [permissionIssue, setPermissionIssue] = useState(false);

  const runChecks = useCallback(async () => {
    setPhase('checking');
    setMessage(null);

    // /auth/me lengkap — mengisi role dsb. sebelum Home dirender (Home memilih body berdasar role).
    // Best-effort: kegagalan tidak memblokir (interceptor axios sudah menangani token kedaluwarsa
    // → refresh / logout otomatis).
    try {
      await dispatch(refreshUser()).unwrap();
    } catch {
      // abaikan — lanjut pakai data user seadanya dari response login
    }

    // Izin lokasi + mulai foreground service tracking. Hanya penolakan izin lokasi (FINE_LOCATION)
    // yang melempar & memblokir; izin notifikasi / lokasi-latar-belakang tetap best-effort.
    try {
      await startBackgroundLocationTracking();
    } catch (error) {
      const isPermissionIssue = error instanceof LocationUnavailableError;
      setPermissionIssue(isPermissionIssue);
      setMessage(
        isPermissionIssue
          ? error.message
          : 'Gagal menyiapkan aplikasi. Periksa koneksi internet lalu coba lagi.',
      );
      setPhase('blocked');
      return;
    }

    dispatch(appCheckCompleted());
    navigation.replace(ROUTES.main);
  }, [dispatch, navigation]);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  function handleLogout() {
    // Jalan keluar kalau user tidak mau memberi izin — pola sama seperti Settings/ChangePassword:
    // keluar dari UI langsung, API + cleanup jalan di background.
    dispatch(logoutLocal());
    dispatch(logout());
  }

  return (
    <View style={styles.root}>
      <AuthBackground />
      <SafeAreaView style={styles.safe}>
        <MotiView
          style={styles.center}
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={authEnterTransition}>
          <View style={styles.logoBadge}>
            <Image source={logo.LogoIcon} style={styles.logoImage} resizeMode="contain" />
          </View>

          {phase === 'checking' ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
              <Text style={styles.title}>Memeriksa aplikasi…</Text>
              <Text style={styles.subtitle}>Menyiapkan izin dan menyinkronkan data.</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>
                {permissionIssue ? 'Izin Aplikasi Diperlukan' : 'Gagal Menyiapkan Aplikasi'}
              </Text>
              <Text style={styles.subtitle}>{message}</Text>

              <GradientButton label="Coba Lagi" onPress={runChecks} style={styles.retry} />

              {permissionIssue ? (
                <PressableScale style={styles.linkButton} onPress={openAppSettings}>
                  <Text style={styles.link}>Buka Pengaturan</Text>
                </PressableScale>
              ) : null}

              <PressableScale style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutLabel}>Logout</Text>
              </PressableScale>
            </>
          )}
        </MotiView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.authGradientStart,
  },
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginBottom: 28,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  spinner: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.heading,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  retry: {
    marginTop: 28,
    alignSelf: 'stretch',
  },
  linkButton: {
    marginTop: 18,
    alignSelf: 'center',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  logoutButton: {
    marginTop: 16,
    alignSelf: 'center',
  },
  logoutLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
