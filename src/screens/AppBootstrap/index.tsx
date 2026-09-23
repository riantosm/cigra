import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logo } from '@/assets';
import AuthBackground from '@/components/atoms/AuthBackground';
import GradientButton from '@/components/atoms/GradientButton';
import PressableScale from '@/components/atoms/PressableScale';
import { useDoubleBackToExit } from '@/hooks/useDoubleBackToExit';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { appCheckCompleted, logout, logoutLocal, refreshUser } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';
import { authEnterTransition } from '@/utils/motion';
import { withTimeout } from '@/utils/async';
import { cleanValue, greetingForHour } from '@/utils/format';
import { locationTracking } from '@/native/locationTracking';
import {
  isBackgroundLocationPermissionGranted,
  isLocationPermissionGranted,
  openAppSettings,
  requestBackgroundLocationPermission,
  requestForegroundLocationPermission,
  requestNotificationPermission,
  type PermissionRequestResult,
} from '@/utils/location';

export type AppBootstrapScreenProps = RootStackScreenProps<typeof ROUTES.appBootstrap>;

// `waiting` = tertahan menunggu izin wajib (lokasi, lalu lokasi latar belakang) diberikan.
type Phase = 'checking' | 'waiting';
type RequiredPermission = 'location' | 'background';

// Sengaja pendek: dialog izin di langkah berikutnya harus muncul maks ~5 detik setelah layar
// dibuka. Kalau /auth/me belum balas, request-nya tetap jalan di belakang (refreshUser tetap
// mengisi state saat selesai) — kita cuma berhenti menunggunya.
const SYNC_TIMEOUT_MS = 5000;

// Urutan langkah di layar ini. Hanya langkah API yang punya batas waktu; langkah izin menunggu
// keputusan pengguna — izin lokasi & lokasi latar belakang WAJIB, layar ini menahan pengguna
// sampai keduanya diberikan. Izin notifikasi best-effort.
const STEPS: { key: StepKey; label: string; detail: string; timeoutMs?: number }[] = [
  {
    key: 'sync',
    label: 'Menyinkronkan akun',
    detail: 'Memanggil API — mengambil data peran & profil terbaru.',
    timeoutMs: SYNC_TIMEOUT_MS,
  },
  { key: 'notification', label: 'Izin notifikasi', detail: 'Meminta izin notifikasi.' },
  { key: 'location', label: 'Izin lokasi', detail: 'Meminta izin lokasi.' },
  {
    key: 'background',
    label: 'Izin lokasi latar belakang',
    detail: 'Pilih "Izinkan sepanjang waktu" supaya posisi tetap terkirim saat aplikasi ditutup.',
  },
  { key: 'tracking', label: 'Memulai pelacakan', detail: 'Menyalakan pelacakan lokasi.' },
];

type StepKey = 'sync' | 'notification' | 'location' | 'background' | 'tracking';

// Saat menunggu izin wajib, statusnya dicek ulang tiap interval ini (pengguna bisa saja
// mengizinkan lewat Pengaturan) — begitu diizinkan, alur otomatis lanjut.
const PERMISSION_POLL_MS = 5000;

// Batas aman untuk start tracking (bridge native pernah tidak membalas di APK release) supaya
// layar tidak macet selamanya.
const NATIVE_STEP_TIMEOUT_MS = 15000;

const WAITING_COPY: Record<RequiredPermission, { title: string; message: string; blocked: string; button: string }> = {
  location: {
    title: 'Izin Lokasi Diperlukan',
    message: 'Aplikasi memerlukan izin lokasi untuk mengirim sinyal darurat dan melacak posisi.',
    blocked: 'Izin lokasi ditolak. Buka Pengaturan → Izin → Lokasi, lalu pilih "Izinkan sepanjang waktu".',
    button: 'Izinkan Lokasi',
  },
  background: {
    title: 'Izinkan Lokasi Sepanjang Waktu',
    message:
      'Posisi harus tetap terkirim meski aplikasi ditutup. Pada halaman izin lokasi, pilih "Izinkan sepanjang waktu".',
    blocked: 'Buka Pengaturan → Izin → Lokasi, lalu pilih "Izinkan sepanjang waktu".',
    button: 'Izinkan Sepanjang Waktu',
  },
};

const PERMISSION_CHECK: Record<RequiredPermission, () => Promise<boolean>> = {
  location: isLocationPermissionGranted,
  background: isBackgroundLocationPermissionGranted,
};

const PERMISSION_REQUEST: Record<RequiredPermission, () => Promise<PermissionRequestResult>> = {
  location: requestForegroundLocationPermission,
  background: requestBackgroundLocationPermission,
};

// Perantara antara "API login sukses" dan Home. Loading di layar Login sekarang hanya untuk
// request /auth/login; sisa pekerjaan (sinkronisasi /auth/me + izin notifikasi → lokasi → lokasi
// latar belakang + start tracking) dipindah ke sini supaya tidak menahan navigasi keluar dari Login.
// Tidak bisa di-back (dicapai lewat navigation.replace + gestureEnabled:false; hardware back
// Android → double-press keluar app lewat useDoubleBackToExit).
export default function AppBootstrapScreen(props: AppBootstrapScreenProps) {
  const { navigation } = props;
  const dispatch = useAppDispatch();
  useDoubleBackToExit();
  const user = useAppSelector(state => state.auth.user);
  // Nama lengkap personel kalau sudah ada (terisi setelah /auth/me), else nama akun dari login.
  const greetingName = cleanValue(user?.personnel?.full_name) ?? cleanValue(user?.name);
  const greeting = `Selamat ${greetingForHour(new Date().getHours())}${greetingName ? `, ${greetingName}` : ''}`;

  const [phase, setPhase] = useState<Phase>('checking');
  const [stepKey, setStepKey] = useState<StepKey>('sync');
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(SYNC_TIMEOUT_MS / 1000));
  const [waitingFor, setWaitingFor] = useState<RequiredPermission>('location');
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  const mountedRef = useRef(true);
  // Izin wajib yang sudah diproses kelanjutannya — mencegah satu izin diproses dua kali
  // (mis. polling + tombol hampir berbarengan).
  const handledRef = useRef(new Set<RequiredPermission>());
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const goToMain = useCallback(() => {
    dispatch(appCheckCompleted());
    navigation.replace(ROUTES.main);
  }, [dispatch, navigation]);

  const startTrackingAndFinish = useCallback(async () => {
    setPhase('checking');
    setStepKey('tracking');
    try {
      await withTimeout(locationTracking.startTracking(), NATIVE_STEP_TIMEOUT_MS);
    } catch {
      // best-effort — RootNavigator mencoba lagi tiap app dibuka.
    }
    if (!mountedRef.current) return;
    goToMain();
  }, [goToMain]);

  // Minta satu izin wajib. Diizinkan → lanjut ke izin berikutnya / selesai; belum → fase
  // `waiting` (polling 5 detik di bawah yang akan memanggil `onPermissionGranted`).
  const askPermission = useCallback(
    async (permission: RequiredPermission) => {
      setPhase('checking');
      setStepKey(permission);
      let result: PermissionRequestResult = 'denied';
      try {
        result = await PERMISSION_REQUEST[permission]();
      } catch {
        // anggap belum diizinkan — polling tetap menangkapnya kalau ternyata diizinkan.
      }
      if (!mountedRef.current) return;
      if (result === 'granted') {
        onPermissionGrantedRef.current(permission);
        return;
      }
      setWaitingFor(permission);
      setPermissionBlocked(result === 'blocked');
      setPhase('waiting');
    },
    [],
  );

  const onPermissionGranted = useCallback(
    (permission: RequiredPermission) => {
      if (handledRef.current.has(permission)) return;
      handledRef.current.add(permission);
      if (permission === 'location') {
        askPermission('background');
      } else {
        startTrackingAndFinish();
      }
    },
    [askPermission, startTrackingAndFinish],
  );
  // askPermission butuh onPermissionGranted dan sebaliknya — diputus lewat ref.
  const onPermissionGrantedRef = useRef(onPermissionGranted);
  onPermissionGrantedRef.current = onPermissionGranted;

  const runChecks = useCallback(async () => {
    handledRef.current.clear();
    setPhase('checking');

    // Langkah 1 — sinkronisasi /auth/me. Selalu best-effort.
    setStepKey('sync');
    try {
      await withTimeout(dispatch(refreshUser()).unwrap(), SYNC_TIMEOUT_MS);
    } catch {
      // abaikan — lanjut pakai data user seadanya dari response login
    }
    if (!mountedRef.current) return;

    // Langkah 2 — izin notifikasi (best-effort, tidak memblokir).
    setStepKey('notification');
    try {
      await requestNotificationPermission();
    } catch {
      // abaikan
    }
    if (!mountedRef.current) return;

    // Langkah 3 & 4 — izin lokasi lalu lokasi latar belakang (WAJIB).
    await askPermission('location');
  }, [dispatch, askPermission]);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  // Selama menunggu izin wajib: cek ulang tiap 5 detik + tiap app kembali aktif (mis. pulang
  // dari halaman Pengaturan) — begitu diizinkan, lanjut otomatis tanpa perlu tap apa pun.
  useEffect(() => {
    if (phase !== 'waiting') return;
    let cancelled = false;
    const check = async () => {
      try {
        const granted = await PERMISSION_CHECK[waitingFor]();
        if (granted && !cancelled) onPermissionGranted(waitingFor);
      } catch {
        // abaikan — coba lagi di interval berikutnya
      }
    };
    const interval = setInterval(check, PERMISSION_POLL_MS);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      subscription.remove();
    };
  }, [phase, waitingFor, onPermissionGranted]);

  const stepIndex = Math.max(0, STEPS.findIndex(step => step.key === stepKey));
  const currentStep = STEPS[stepIndex] ?? STEPS[0];
  const currentTimeoutMs = currentStep.timeoutMs;

  // Countdown hanya untuk langkah yang punya batas waktu (sinkronisasi API) — langkah izin
  // menunggu pengguna, jadi tidak ada "maks N detik".
  useEffect(() => {
    if (phase !== 'checking' || !currentTimeoutMs) return;
    setSecondsLeft(Math.ceil(currentTimeoutMs / 1000));
    const interval = setInterval(() => {
      setSecondsLeft(current => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [stepIndex, phase, currentTimeoutMs]);

  function handleLogout() {
    // Jalan keluar kalau user tidak mau memberi izin — pola sama seperti Settings/ChangePassword:
    // keluar dari UI langsung, API + cleanup jalan di background.
    dispatch(logoutLocal());
    dispatch(logout());
  }

  const elapsedFractionInStep = currentTimeoutMs
    ? 1 - secondsLeft / Math.ceil(currentTimeoutMs / 1000)
    : 0;
  const progressPercent = Math.min(
    100,
    Math.max(0, ((stepIndex + elapsedFractionInStep) / STEPS.length) * 100),
  );

  return (
    <View style={styles.root}>
      <AuthBackground />
      <SafeAreaView style={styles.safe}>
        <MotiView
          style={styles.center}
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={authEnterTransition}>
          <Image source={logo.LogoIcon} style={styles.logoImage} resizeMode="contain" />

          <Text style={styles.greeting} numberOfLines={2}>
            {greeting}
          </Text>

          {phase === 'checking' ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
              <Text style={styles.title}>Memeriksa aplikasi…</Text>
              <Text style={styles.subtitle}>{currentStep.detail}</Text>

              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                </View>
                <View style={styles.progressMetaRow}>
                  <Text style={styles.progressMetaText}>
                    Langkah {stepIndex + 1} dari {STEPS.length} · {currentStep.label}
                  </Text>
                  {currentTimeoutMs ? (
                    <Text style={styles.progressMetaText}>maks {secondsLeft} detik lagi</Text>
                  ) : null}
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>{WAITING_COPY[waitingFor].title}</Text>
              <Text style={styles.subtitle}>
                {permissionBlocked ? WAITING_COPY[waitingFor].blocked : WAITING_COPY[waitingFor].message}
              </Text>

              <View style={styles.waitingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.progressMetaText}>Menunggu izin — dicek otomatis tiap 5 detik</Text>
              </View>

              <GradientButton
                label={permissionBlocked ? 'Buka Pengaturan' : WAITING_COPY[waitingFor].button}
                onPress={permissionBlocked ? openAppSettings : () => askPermission(waitingFor)}
                style={styles.retry}
              />

              {permissionBlocked ? null : (
                <PressableScale style={styles.linkButton} onPress={openAppSettings}>
                  <Text style={styles.link}>Buka Pengaturan</Text>
                </PressableScale>
              )}

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
  logoImage: {
    width: 88,
    height: 88,
    marginBottom: 28,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 20,
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
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  progressWrap: {
    alignSelf: 'stretch',
    marginTop: 24,
    gap: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.pillTrackSurface,
    borderWidth: 1,
    borderColor: colors.pillTrackBorder,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressMetaText: {
    flexShrink: 1,
    fontSize: 11,
    color: colors.textMuted,
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
