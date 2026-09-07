import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

import Badge from '@/components/atoms/Badge';
import CodeChip from '@/components/atoms/CodeChip';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import GradientButton from '@/components/atoms/GradientButton';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { checkinPatrolCheckpointApi } from '@/services/api/patrol.service';
import { colors } from '@/theme/colors';
import { tabBarShadow } from '@/theme/shadows';
import {
  getCameraPermissionStatus,
  openCameraSettings,
  requestCameraPermission,
} from '@/utils/cameraPermission';
import { extractErrorMessage } from '@/utils/format';
import {
  getCurrentCoordinates,
  LocationUnavailableError,
  openAppSettings,
  openLocationSettings,
} from '@/utils/location';
import type { Coordinates } from '@/utils/location';
import { coordLabel } from '@/utils/patrol';

type Props = RootStackScreenProps<typeof ROUTES.patrolPhoto>;

type PermState = 'checking' | 'granted' | 'denied' | 'blocked';

type SubmitModal =
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'gps'; message: string; reason: 'permission-denied' | 'gps-disabled' }
  | null;

function clockNow(): string {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function toUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

export default function PatrolPhotoScreen(props: Props) {
  const { navigation, route } = props;
  const { sessionId, checkpointName, checkpointCode, sequenceOrder, totalCheckpoints } =
    route.params;
  const isFocused = useIsFocused();

  const device = useCameraDevice('front');
  const cameraRef = useRef<Camera>(null);
  const [perm, setPerm] = useState<PermState>('checking');
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [gps, setGps] = useState<Coordinates | null>(null);
  const [gpsPending, setGpsPending] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitModal, setSubmitModal] = useState<SubmitModal>(null);

  const fetchGps = useCallback(async (): Promise<Coordinates | null> => {
    setGpsPending(true);
    setGpsError(null);
    try {
      const coords = await getCurrentCoordinates();
      setGps(coords);
      return coords;
    } catch (error) {
      setGpsError(
        error instanceof LocationUnavailableError
          ? error.message
          : 'Gagal mengambil lokasi GPS.',
      );
      return null;
    } finally {
      setGpsPending(false);
    }
  }, []);

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

  async function handleCapture() {
    if (isCapturing || !cameraRef.current) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto();
      setPhotoPath(photo.path);
      setCapturedAt(clockNow());
      // Ambil GPS di latar begitu foto jadi — check-in butuh koordinat riil.
      fetchGps();
    } catch {
      // gagal ambil foto — biarkan user coba lagi
    } finally {
      setIsCapturing(false);
    }
  }

  function retake() {
    setPhotoPath(null);
    setCapturedAt(null);
    setGps(null);
    setGpsError(null);
  }

  async function handleSubmit() {
    if (isSubmitting || !photoPath) return;
    setIsSubmitting(true);
    try {
      const coords = gps ?? (await fetchGps());
      if (!coords) {
        setIsSubmitting(false);
        return; // gpsError sudah tampil di kartu — biarkan user "Coba Ambil Lokasi" lagi
      }
      const result = await checkinPatrolCheckpointApi(
        sessionId,
        {
          qr_code: checkpointCode,
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
        { uri: toUri(photoPath), name: `patrol-${sessionId}-cp${sequenceOrder}.jpg`, type: 'image/jpeg' },
      );
      setSubmitModal({ kind: 'success', message: result.message });
    } catch (error) {
      if (error instanceof LocationUnavailableError) {
        setSubmitModal({
          kind: 'gps',
          message: error.message,
          reason: error.reason === 'gps-disabled' ? 'gps-disabled' : 'permission-denied',
        });
      } else {
        setSubmitModal({
          kind: 'error',
          message: extractErrorMessage(error, 'Gagal mengirim bukti checkpoint.'),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmitModalClose() {
    const wasSuccess = submitModal?.kind === 'success';
    setSubmitModal(null);
    if (wasSuccess) navigation.goBack();
  }

  // --- Tinjau foto (review) ---
  if (photoPath) {
    return (
      <MainLayout
        title="Tinjau Foto Bukti"
        subtitle="Periksa foto sebelum dikirim"
        variant="canvas"
        onBack={() => navigation.goBack()}>
        <View style={styles.flex}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.reviewContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.previewWrap}>
              <Image source={{ uri: toUri(photoPath) }} style={styles.preview} resizeMode="cover" />
              <View style={styles.previewChips}>
                <View style={styles.previewChip}>
                  <Icon name="clock" size={12} color="#FFFFFF" />
                  <Text style={styles.previewChipText}>{capturedAt} WIB</Text>
                </View>
                {gps ? (
                  <View style={styles.previewChip}>
                    <Icon name="map-pin" size={12} color="#FFFFFF" />
                    <Text style={styles.previewChipText}>
                      {coordLabel(gps.latitude, gps.longitude)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <Card style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Text style={styles.infoTitle}>{checkpointName}</Text>
                <Badge label="QR cocok" variant="success" />
              </View>
              <InfoRow icon="qr-code" label="Kode checkpoint" value={checkpointCode} mono />
              <InfoRow icon="clock" label="Waktu ambil" value={`${capturedAt} WIB`} />
              <InfoRow
                icon="map-pin"
                label={`Titik ke-${sequenceOrder}`}
                value={`dari ${totalCheckpoints} checkpoint`}
              />
            </Card>

            <View style={[styles.gpsNote, gpsError && styles.gpsNoteError]}>
              <Icon
                name={gpsError ? 'alert-triangle' : 'map-pin'}
                size={16}
                color={gpsError ? colors.danger : colors.primary}
              />
              <Text style={[styles.gpsNoteText, gpsError && styles.gpsNoteTextError]}>
                {gpsError
                  ? gpsError
                  : gps
                    ? 'Lokasi GPS terlampir untuk verifikasi jarak ke checkpoint.'
                    : gpsPending
                      ? 'Mengambil lokasi GPS…'
                      : 'Lokasi GPS akan diambil saat mengirim bukti.'}
              </Text>
              {gpsError && !gpsPending ? (
                <PressableScale scaleTo={0.96} onPress={() => fetchGps()} hitSlop={8}>
                  <Text style={styles.gpsRetry}>Coba lagi</Text>
                </PressableScale>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.reviewFooter}>
            <PressableScale
              scaleTo={0.97}
              onPress={retake}
              disabled={isSubmitting}
              contentStyle={styles.retakeButton}>
              <Icon name="refresh" size={17} color={colors.heading} />
              <Text style={styles.retakeText}>Ulangi</Text>
            </PressableScale>
            <GradientButton
              label="Kirim Bukti"
              tone="success"
              icon="check"
              height={54}
              loading={isSubmitting || gpsPending}
              onPress={handleSubmit}
              style={styles.sendButton}
            />
          </View>
        </View>

        <StatusModal
          visible={submitModal !== null}
          variant={submitModal?.kind === 'success' ? 'success' : 'error'}
          title={
            submitModal?.kind === 'success'
              ? 'Checkpoint Tercatat'
              : submitModal?.kind === 'gps'
                ? 'Lokasi GPS Diperlukan'
                : 'Gagal Kirim Bukti'
          }
          message={submitModal?.message ?? ''}
          onRequestClose={() => setSubmitModal(null)}
          primaryAction={{
            label:
              submitModal?.kind === 'success'
                ? 'Selesai'
                : submitModal?.kind === 'gps'
                  ? 'Buka Pengaturan'
                  : 'Tutup',
            onPress: () => {
              if (submitModal?.kind === 'gps') {
                if (submitModal.reason === 'gps-disabled') openLocationSettings();
                else openAppSettings();
                setSubmitModal(null);
              } else {
                handleSubmitModalClose();
              }
            },
          }}
          secondaryAction={
            submitModal?.kind === 'gps'
              ? { label: 'Tutup', onPress: () => setSubmitModal(null) }
              : undefined
          }
        />
      </MainLayout>
    );
  }

  // --- Ambil foto (capture) ---
  const cameraActive = isFocused && perm === 'granted';

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <PressableScale onPress={() => navigation.goBack()} contentStyle={styles.backButton}>
          <Icon name="arrow-left" size={22} color="#F8FAFC" />
        </PressableScale>
        <View style={styles.topBarText}>
          <Text style={styles.title}>Foto Bukti Checkpoint</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {checkpointName} · {checkpointCode}
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
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={cameraActive}
                photo
              />
            ) : (
              <View style={styles.fallbackInSquare}>
                <Text style={styles.fallbackText}>
                  Kamera depan tidak tersedia di perangkat ini.
                </Text>
              </View>
            )}
            <View style={styles.faceGuide}>
              <View style={[styles.gcorner, styles.gcornerTL]} />
              <View style={[styles.gcorner, styles.gcornerTR]} />
              <View style={[styles.gcorner, styles.gcornerBL]} />
              <View style={[styles.gcorner, styles.gcornerBR]} />
            </View>
          </View>

          <View style={styles.belowCam}>
            <View style={styles.verifiedBanner}>
              <Icon name="check" size={16} color="#4ADE80" />
              <Text style={styles.verifiedText}>QR checkpoint terverifikasi</Text>
            </View>
            <Text style={styles.hint}>Posisikan wajah dalam bingkai, lalu ambil foto</Text>
            <View style={styles.belowCamSpacer} />
            <View style={styles.shutterRow}>
              <PressableScale
                scaleTo={0.9}
                onPress={handleCapture}
                disabled={isCapturing}
                contentStyle={styles.shutterOuter}>
                {isCapturing ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </PressableScale>
              <Text style={styles.shutterLabel}>Ambil Foto</Text>
            </View>
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
            ? 'Izin kamera ditolak permanen. Aktifkan izin kamera lewat Pengaturan aplikasi untuk mengambil foto bukti patroli.'
            : 'Patroli memerlukan kamera untuk mengambil foto bukti kehadiran di checkpoint.'
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

function InfoRow(props: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Icon name={props.icon} size={16} color={colors.textMuted} />
      <Text style={styles.rowLabel}>{props.label}</Text>
      {props.mono ? (
        <CodeChip code={props.value} />
      ) : (
        <Text style={styles.rowValue}>{props.value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1220' },
  flex: { flex: 1 },
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
  belowCam: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28, gap: 12 },
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
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: 'rgba(22,163,74,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.4)',
  },
  verifiedText: { fontSize: 13, color: '#E2E8F0' },
  faceGuide: {
    position: 'absolute',
    top: '12%',
    bottom: '12%',
    alignSelf: 'center',
    aspectRatio: 0.78,
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.7)',
    borderRadius: 999,
    borderStyle: 'dashed',
  },
  gcorner: { position: 'absolute', width: 28, height: 28, borderColor: '#60A5FA' },
  gcornerTL: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 },
  gcornerTR: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 },
  gcornerBL: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 },
  gcornerBR: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },
  hint: {
    alignSelf: 'center',
    fontSize: 13,
    color: '#CBD5E1',
  },
  shutterRow: {
    alignItems: 'center',
    gap: 10,
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 999, backgroundColor: '#FFFFFF' },
  shutterLabel: { fontSize: 12, color: '#CBD5E1', fontWeight: '600' },
  // review
  reviewContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 120, gap: 16 },
  previewWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  preview: { width: '100%', aspectRatio: 1, backgroundColor: colors.chipSurface },
  previewChips: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', gap: 6 },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.7)',
  },
  previewChipText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  infoCard: { gap: 4 },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  rowLabel: { flex: 1, fontSize: 13, color: colors.textMuted },
  rowValue: { fontSize: 13, fontWeight: '600', color: colors.heading },
  gpsNote: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.chipSurface,
    borderRadius: 14,
    padding: 12,
  },
  gpsNoteError: { backgroundColor: colors.dangerSurface },
  gpsNoteText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  gpsNoteTextError: { color: colors.dangerText },
  gpsRetry: { fontSize: 12, fontWeight: '700', color: colors.danger },
  reviewFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  retakeButton: {
    width: 132,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  retakeText: { fontSize: 14, fontWeight: '600', color: colors.heading },
  sendButton: { flex: 1 },
});
