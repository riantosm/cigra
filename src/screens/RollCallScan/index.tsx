import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import StatusModal from '@/components/organisms/StatusModal';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  searchRollCallPersonnelApi,
  submitRollCallEntryApi,
} from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import type { RollCallPersonnelSearchItem } from '@/types';
import {
  getCameraPermissionStatus,
  openCameraSettings,
  requestCameraPermission,
} from '@/utils/cameraPermission';
import { extractErrorMessage } from '@/utils/format';
import { entryStatusLabel } from '@/utils/rollCall';

type Props = RootStackScreenProps<typeof ROUTES.rollCallScan>;

type PermState = 'checking' | 'granted' | 'denied' | 'blocked';

// QR kartu anggota bisa berupa NRP polos ATAU JSON berisi nrp/service_number — ambil identitasnya.
function nrpFromQr(raw: string): string {
  const value = raw.trim();
  if (value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const candidate = parsed.service_number ?? parsed.nrp ?? parsed.nip ?? parsed.id;
      if (candidate != null) return String(candidate).trim();
    } catch {
      // bukan JSON valid — pakai apa adanya
    }
  }
  return value;
}

export default function RollCallScanScreen(props: Props) {
  const { navigation, route } = props;
  const { sessionId, status } = route.params;
  const isPresent = status === 'present';
  const isFocused = useIsFocused();

  const device = useCameraDevice('back');
  const [perm, setPerm] = useState<PermState>('checking');
  const [markedCount, setMarkedCount] = useState(0);
  const [toast, setToast] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const busyRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensurePermission = useCallback(async (prompt: boolean) => {
    const current = getCameraPermissionStatus();
    if (current === 'granted') {
      setPerm('granted');
      return;
    }
    if (!prompt) {
      setPerm(current);
      return;
    }
    const outcome = await requestCameraPermission();
    setPerm(outcome === 'granted' ? 'granted' : outcome);
  }, []);

  useEffect(() => {
    ensurePermission(true);
  }, [ensurePermission]);

  // Kembali dari halaman Pengaturan → cek ulang izin (tanpa memunculkan dialog lagi).
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') ensurePermission(false);
    });
    return () => sub.remove();
  }, [ensurePermission]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  function flashToast(tone: 'ok' | 'err', text: string) {
    setToast({ tone, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  const handleCode = useCallback(
    async (value: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      const nrp = nrpFromQr(value);
      try {
        const matches = await searchRollCallPersonnelApi(nrp);
        const person =
          matches.find((m: RollCallPersonnelSearchItem) => m.service_number === nrp) ?? matches[0] ?? null;
        if (!person) {
          flashToast('err', `Kartu tidak dikenali (${nrp})`);
          return;
        }

        if (isPresent) {
          await submitRollCallEntryApi(sessionId, { personnel_id: person.id, status: 'present' });
          setMarkedCount(c => c + 1);
          flashToast('ok', `${person.full_name} — hadir`);
        } else {
          navigation.navigate(ROUTES.rollCallEntry, {
            sessionId,
            personnelId: person.id,
            personnelName: person.full_name,
            personnelPhoto: person.photo,
            serviceNumber: person.service_number,
            status: 'absent',
          });
        }
      } catch (error) {
        flashToast('err', extractErrorMessage(error, 'Gagal memproses kartu.'));
      } finally {
        // Jeda sebelum menerima scan berikutnya (hindari submit ganda dari 1 QR).
        setTimeout(() => {
          busyRef.current = false;
        }, 1600);
      }
    },
    [isPresent, navigation, sessionId],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      const value = codes[0]?.value;
      if (value) handleCode(value);
    },
  });

  const cameraActive = isFocused && perm === 'granted';

  return (
    <View style={styles.root}>
      {perm === 'granted' && device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={cameraActive}
          codeScanner={codeScanner}
        />
      ) : (
        <View style={styles.fallback}>
          {perm === 'checking' ? <ActivityIndicator color="#fff" /> : null}
          {perm === 'granted' && !device ? (
            <Text style={styles.fallbackText}>Kamera tidak tersedia di perangkat ini.</Text>
          ) : null}
        </View>
      )}

      {/* header */}
      <View style={styles.topBar}>
        <PressableScale onPress={() => navigation.goBack()} contentStyle={styles.backButton}>
          <Icon name="arrow-left" size={22} color="#F8FAFC" />
        </PressableScale>
        <View>
          <Text style={styles.title}>Scan QR Kartu Anggota</Text>
          <Text style={styles.subtitle}>{entryStatusLabel[status]}</Text>
        </View>
      </View>

      {perm === 'granted' ? (
        <>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.hint}>Arahkan kamera ke QR pada kartu anggota</Text>

          {toast ? (
            <View style={[styles.toast, toast.tone === 'ok' ? styles.toastOk : styles.toastErr]}>
              <Icon
                name={toast.tone === 'ok' ? 'check' : 'alert-triangle'}
                size={16}
                color={toast.tone === 'ok' ? colors.success : colors.danger}
              />
              <Text style={styles.toastText}>{toast.text}</Text>
            </View>
          ) : null}

          {isPresent && markedCount > 0 ? (
            <View style={styles.counter}>
              <Text style={styles.counterText}>{markedCount} personel ditandai hadir</Text>
            </View>
          ) : null}
        </>
      ) : null}

      <StatusModal
        visible={perm === 'denied' || perm === 'blocked'}
        variant="error"
        title="Izin Kamera Diperlukan"
        message={
          perm === 'blocked'
            ? 'Izin kamera ditolak permanen. Aktifkan izin kamera lewat Pengaturan aplikasi untuk memindai QR.'
            : 'Aplikasi memerlukan izin kamera untuk memindai QR kartu anggota.'
        }
        onRequestClose={() => navigation.goBack()}
        primaryAction={{
          label: perm === 'blocked' ? 'Buka Pengaturan' : 'Coba Lagi',
          onPress: () => {
            if (perm === 'blocked') openCameraSettings();
            else ensurePermission(true);
          },
        }}
        secondaryAction={{ label: 'Kembali', onPress: () => navigation.goBack() }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1220' },
  fallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  fallbackText: { color: '#CBD5E1', fontSize: 13, textAlign: 'center' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#F8FAFC', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  viewfinder: {
    position: 'absolute',
    top: '32%',
    alignSelf: 'center',
    width: 240,
    height: 240,
  },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: colors.gradientPrimaryStart },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 6 },
  hint: {
    position: 'absolute',
    top: '32%',
    marginTop: 260,
    alignSelf: 'center',
    fontSize: 13,
    color: '#CBD5E1',
  },
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  toastOk: { borderWidth: 1, borderColor: colors.successSurface },
  toastErr: { borderWidth: 1, borderColor: colors.dangerSurface },
  toastText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.heading },
  counter: {
    position: 'absolute',
    bottom: 44,
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(37,99,235,0.9)',
  },
  counterText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
