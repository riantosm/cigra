import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import StatusModal from '@/components/organisms/StatusModal';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import {
  getCameraPermissionStatus,
  openCameraSettings,
  requestCameraPermission,
} from '@/utils/cameraPermission';

type Props = RootStackScreenProps<typeof ROUTES.patrolScan>;

type PermState = 'checking' | 'granted' | 'denied' | 'blocked';

// QR checkpoint bisa berupa kode polos ("CHK-PTR-3") atau JSON berisi qr_code/code — ambil kodenya.
function codeFromQr(raw: string): string {
  const value = raw.trim();
  if (value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const candidate = parsed.qr_code ?? parsed.code ?? parsed.checkpoint ?? parsed.id;
      if (candidate != null) return String(candidate).trim();
    } catch {
      // bukan JSON — pakai apa adanya
    }
  }
  return value;
}

export default function PatrolScanScreen(props: Props) {
  const { navigation, route } = props;
  const { sessionId, routeName, totalCheckpoints, nextCheckpoint } = route.params;
  const isFocused = useIsFocused();

  const device = useCameraDevice('back');
  const [perm, setPerm] = useState<PermState>('checking');
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
    (value: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      const scanned = codeFromQr(value);
      const matches =
        scanned.toUpperCase() === nextCheckpoint.qrCode.toUpperCase() ||
        scanned.toUpperCase().includes(nextCheckpoint.qrCode.toUpperCase());

      if (!matches) {
        flashToast('err', `QR tidak cocok dengan ${nextCheckpoint.name}`);
        setTimeout(() => {
          busyRef.current = false;
        }, 1600);
        return;
      }

      flashToast('ok', `Checkpoint terbaca: ${nextCheckpoint.name}`);
      setTimeout(() => {
        navigation.replace(ROUTES.patrolPhoto, {
          sessionId,
          checkpointName: nextCheckpoint.name,
          checkpointCode: nextCheckpoint.qrCode,
          sequenceOrder: nextCheckpoint.sequenceOrder,
          totalCheckpoints,
        });
      }, 350);
    },
    [navigation, nextCheckpoint, sessionId, totalCheckpoints],
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
      <View style={styles.topBar}>
        <PressableScale onPress={() => navigation.goBack()} contentStyle={styles.backButton}>
          <Icon name="arrow-left" size={22} color="#F8FAFC" />
        </PressableScale>
        <View style={styles.topBarText}>
          <Text style={styles.title}>Scan QR Checkpoint</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {routeName ? `${routeName} · ` : ''}Checkpoint {nextCheckpoint.sequenceOrder}
          </Text>
        </View>
        {perm === 'granted' ? (
          <View style={styles.camPill}>
            <View style={styles.camDot} />
            <Text style={styles.camPillText}>Kamera aktif</Text>
          </View>
        ) : null}
      </View>

      {perm === 'granted' ? (
        <View style={styles.content}>
          <View style={styles.cameraSquare}>
            {device ? (
              <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={cameraActive}
                codeScanner={codeScanner}
              />
            ) : (
              <View style={styles.fallbackInSquare}>
                <Text style={styles.fallbackText}>Kamera tidak tersedia di perangkat ini.</Text>
              </View>
            )}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          <View style={styles.belowCam}>
            <Text style={styles.hint}>Arahkan kamera ke QR pada papan checkpoint</Text>

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

            <View style={styles.belowCamSpacer} />

            <View style={styles.pendingNote}>
              <Icon name="info" size={15} color="#93C5FD" />
              <Text style={styles.pendingNoteText}>
                Setelah QR cocok, lanjut ambil foto selfie sebagai bukti check-in.
              </Text>
            </View>

            {__DEV__ ? (
              <PressableScale
                scaleTo={0.97}
                onPress={() => handleCode(nextCheckpoint.qrCode)}
                contentStyle={styles.devButton}>
                <Icon name="play" size={15} color="#0B1220" />
                <Text style={styles.devButtonText}>[DEV] Anggap QR benar</Text>
              </PressableScale>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.fallback}>
          {perm === 'checking' ? <ActivityIndicator color="#fff" /> : null}
        </View>
      )}

      <StatusModal
        visible={perm === 'denied' || perm === 'blocked'}
        variant="error"
        title="Izinkan Akses Kamera"
        message={
          perm === 'blocked'
            ? 'Izin kamera ditolak permanen. Aktifkan izin kamera lewat Pengaturan aplikasi untuk memindai QR checkpoint dan mengambil foto bukti.'
            : 'Patroli memerlukan kamera untuk memindai QR di setiap checkpoint dan mengambil foto bukti kehadiran.'
        }
        onRequestClose={() => navigation.goBack()}
        primaryAction={{
          label: perm === 'blocked' ? 'Buka Pengaturan' : 'Izinkan Kamera',
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
  content: { flex: 1, paddingTop: 108 },
  cameraSquare: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
    borderRadius: 24,
  },
  fallbackInSquare: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  belowCam: { flex: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24 },
  belowCamSpacer: { flex: 1 },
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
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  topBarText: { flex: 1 },
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
  camPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(22,163,74,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.4)',
  },
  camDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#4ADE80' },
  camPillText: { fontSize: 11, fontWeight: '700', color: '#86EFAC' },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: colors.gradientPrimaryStart },
  cornerTL: { top: 24, left: 24, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 6 },
  cornerTR: { top: 24, right: 24, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 6 },
  cornerBL: { bottom: 24, left: 24, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 24, right: 24, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 6 },
  hint: {
    alignSelf: 'center',
    fontSize: 13,
    color: '#CBD5E1',
  },
  toast: {
    marginTop: 14,
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
  pendingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(37,99,235,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.4)',
  },
  pendingNoteText: { flex: 1, fontSize: 12, color: '#E2E8F0', lineHeight: 16 },
  devButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FCD34D',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  devButtonText: { fontSize: 13, fontWeight: '800', color: '#0B1220', letterSpacing: 0.2 },
});
