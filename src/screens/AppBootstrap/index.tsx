import { useCallback, useEffect, useRef, useState } from 'react';
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
import { withTimeout } from '@/utils/async';
import { LocationUnavailableError, openAppSettings, startBackgroundLocationTracking } from '@/utils/location';

export type AppBootstrapScreenProps = RootStackScreenProps<typeof ROUTES.appBootstrap>;

type Phase = 'checking' | 'blocked';

// Tiap langkah punya batas waktu sendiri ("berapa detik lagi") supaya layar ini TIDAK PERNAH
// menggantung tanpa kepastian — kalaupun ada langkah yang macet (API lambat, bridge native/izin
// yang tidak pernah membalas — pernah terjadi di APK release), pengguna selalu tahu progresnya
// dan alurnya otomatis lanjut sendiri sebelum batas waktu habis, tanpa perlu kill app.
const STEPS = [
  {
    key: 'sync' as const,
    label: 'Menyinkronkan akun',
    detail: 'Memanggil API — mengambil data peran & profil terbaru.',
    timeoutMs: 12000,
  },
  {
    key: 'location' as const,
    label: 'Menyiapkan izin lokasi',
    detail: 'Meminta izin lokasi.',
    timeoutMs: 40000,
  },
];

// Setelah waktu ini (detik, sejak layar dibuka) tombol "Lewati" muncul — jalan pintas manual
// kalau pengguna tidak mau menunggu sama sekali, terlepas dari timeout otomatis di atas.
const SKIP_AVAILABLE_AFTER_MS = 6000;

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
  const [stepIndex, setStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(STEPS[0].timeoutMs / 1000));
  const [canSkip, setCanSkip] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [permissionIssue, setPermissionIssue] = useState(false);

  const mountedRef = useRef(true);
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

  const runChecks = useCallback(async () => {
    setPhase('checking');
    setMessage(null);
    setPermissionIssue(false);
    setStepIndex(0);

    // Langkah 1 — sinkronisasi /auth/me. Selalu best-effort: kegagalan ATAU macet lebih dari
    // batas waktu tidak boleh menahan pengguna di sini (interceptor axios sudah punya
    // timeout sendiri + auto-refresh token; ini cuma jaring pengaman tambahan di level UI).
    try {
      await withTimeout(dispatch(refreshUser()).unwrap(), STEPS[0].timeoutMs);
    } catch {
      // abaikan — lanjut pakai data user seadanya dari response login
    }
    if (!mountedRef.current) return;

    // Langkah 2 — izin lokasi + mulai foreground service tracking.
    setStepIndex(1);
    try {
      await withTimeout(startBackgroundLocationTracking(), STEPS[1].timeoutMs);
    } catch (error) {
      if (!mountedRef.current) return;
      // Hanya penolakan izin lokasi (FINE_LOCATION) yang sudah PASTI ditolak yang memblokir.
      // Selain itu (timeout / error native lain / macet menunggu bridge) tetap best-effort —
      // Home & Settings punya pengecekan izin lokasi sendiri yang akan menangkapnya belakangan.
      if (error instanceof LocationUnavailableError) {
        setPermissionIssue(true);
        setMessage(error.message);
        setPhase('blocked');
        return;
      }
    }
    if (!mountedRef.current) return;

    goToMain();
  }, [dispatch, goToMain]);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  // Countdown per-langkah — direset tiap kali `stepIndex` berganti, supaya labelnya selalu
  // menunjukkan sisa waktu MAKSIMAL untuk langkah yang sedang berjalan (bukan janji waktu pasti
  // selesai — kerjanya biasanya jauh lebih cepat dari ini, angka ini cuma batas atasnya).
  useEffect(() => {
    if (phase !== 'checking') return;
    const step = STEPS[stepIndex];
    if (!step) return;
    setSecondsLeft(Math.ceil(step.timeoutMs / 1000));
    const interval = setInterval(() => {
      setSecondsLeft(current => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [stepIndex, phase]);

  // Jalan pintas manual — tersedia beberapa detik setelah layar ini dibuka, tidak peduli
  // langkah/timeout otomatis di atas. Ini jaminan terakhir supaya pengguna tidak pernah
  // merasa terjebak menunggu tanpa ada yang bisa dilakukan.
  useEffect(() => {
    if (phase !== 'checking') {
      setCanSkip(false);
      return;
    }
    const timer = setTimeout(() => setCanSkip(true), SKIP_AVAILABLE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  function handleLogout() {
    // Jalan keluar kalau user tidak mau memberi izin — pola sama seperti Settings/ChangePassword:
    // keluar dari UI langsung, API + cleanup jalan di background.
    dispatch(logoutLocal());
    dispatch(logout());
  }

  const currentStep = STEPS[stepIndex] ?? STEPS[STEPS.length - 1];
  // Progres keseluruhan = langkah yang sudah kelar + seberapa jauh countdown langkah berjalan
  // sudah berkurang — jadi bar-nya terus maju tiap detik, bukan cuma "lompat" tiap ganti langkah.
  const elapsedFractionInStep = 1 - secondsLeft / Math.ceil(currentStep.timeoutMs / 1000);
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
          <View style={styles.logoBadge}>
            <Image source={logo.LogoIcon} style={styles.logoImage} resizeMode="contain" />
          </View>

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
                  <Text style={styles.progressMetaText}>maks {secondsLeft} detik lagi</Text>
                </View>
              </View>

              {canSkip ? (
                <PressableScale style={styles.linkButton} onPress={goToMain}>
                  <Text style={styles.link}>Lewati, lanjut ke aplikasi</Text>
                </PressableScale>
              ) : null}
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
