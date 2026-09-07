import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ImageStyle } from 'react-native-fast-image';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import CodeChip from '@/components/atoms/CodeChip';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import Card from '@/components/molecules/Card';
import BottomSheet from '@/components/organisms/BottomSheet';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  completePatrolApi,
  getActivePatrolSessionApi,
  getPatrolRoutesApi,
} from '@/services/api/patrol.service';
import { colors } from '@/theme/colors';
import { tabBarShadow } from '@/theme/shadows';
import type { PatrolCheckpoint, PatrolCheckpointLog, PatrolSession } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import {
  clearPatrolOngoingNotification,
  syncPatrolOngoingNotification,
} from '@/utils/patrolNotification';
import {
  coordLabel,
  patrolClockLabel,
  patrolDateLabel,
  patrolDurationLabel,
  patrolProgressPercent,
} from '@/utils/patrol';

type Props = RootStackScreenProps<typeof ROUTES.patrolActive>;

type Modal =
  | { kind: 'confirm-complete' }
  | { kind: 'result'; variant: 'success' | 'error'; title: string; message: string }
  | null;

function logForCheckpoint(
  logs: PatrolCheckpointLog[] | undefined,
  checkpoint: PatrolCheckpoint,
): PatrolCheckpointLog | undefined {
  return (logs ?? []).find(
    log => log.patrol_checkpoint_id === checkpoint.id || log.checkpoint?.id === checkpoint.id,
  );
}

export default function PatrolActiveScreen(props: Props) {
  const { navigation } = props;

  const [session, setSession] = useState<PatrolSession | null>(null);
  const [checkpoints, setCheckpoints] = useState<PatrolCheckpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<PatrolCheckpointLog | null>(null);
  const [logPhotoWidth, setLogPhotoWidth] = useState(0);
  const isFirstFocus = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const active = await getActivePatrolSessionApi();
      setSession(active);
      syncPatrolOngoingNotification(active);
      // `/patrols/sessions/active` biasanya sudah menyertakan `route.checkpoints`. Kalau tidak
      // (mis. respons ringkas), ambil dari daftar rute sebagai fallback.
      const embedded = active?.route?.checkpoints;
      if (embedded && embedded.length > 0) {
        setCheckpoints([...embedded].sort((a, b) => a.sequence_order - b.sequence_order));
      } else if (active?.route?.id != null) {
        try {
          const routes = await getPatrolRoutesApi();
          const matched = routes.find(r => r.id === active.route?.id);
          setCheckpoints(
            matched
              ? [...matched.checkpoints].sort((a, b) => a.sequence_order - b.sequence_order)
              : [],
          );
        } catch {
          setCheckpoints([]);
        }
      } else {
        setCheckpoints([]);
      }
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat sesi patroli.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(isFirstFocus.current ? 'initial' : 'refresh');
      isFirstFocus.current = false;
    }, [load]),
  );

  const percent = session
    ? patrolProgressPercent(session.completed_checkpoints, session.total_checkpoints)
    : 0;
  const remainingCheckpoints = session
    ? Math.max(0, session.total_checkpoints - session.completed_checkpoints)
    : 0;
  const allCheckpointsDone = !!session && remainingCheckpoints === 0;
  const selectedLogPhoto = selectedLog?.photo_path ?? selectedLog?.photo_url ?? null;

  // Checkpoint yang sudah di-check-in (dari `logs`, dicocokkan by id — bukan asumsi berurutan).
  const doneCheckpointIds = useMemo(
    () =>
      new Set(
        (session?.logs ?? [])
          .map(log => log.patrol_checkpoint_id ?? log.checkpoint?.id)
          .filter((id): id is number => id != null),
      ),
    [session?.logs],
  );

  // Checkpoint berikutnya = checkpoint berurutan pertama yang belum di-check-in.
  const nextCheckpoint = useMemo(
    () => checkpoints.find(cp => !doneCheckpointIds.has(cp.id)) ?? null,
    [checkpoints, doneCheckpointIds],
  );

  async function confirmComplete() {
    if (!session) return;
    setIsCompleting(true);
    try {
      const result = await completePatrolApi(session.id);
      clearPatrolOngoingNotification();
      const durasi = patrolDurationLabel(session.started_at, result.completed_at);
      setModal({
        kind: 'result',
        variant: 'success',
        title: 'Patroli berhasil diselesaikan.',
        message: `${session.route?.name ?? 'Rute patroli'} · durasi ${durasi} · ${session.completed_checkpoints} / ${session.total_checkpoints} checkpoint terverifikasi.`,
      });
    } catch (error) {
      setModal({
        kind: 'result',
        variant: 'error',
        title: 'Gagal Menyelesaikan Patroli',
        message: extractErrorMessage(error, 'Terjadi kesalahan saat menyelesaikan sesi patroli.'),
      });
    } finally {
      setIsCompleting(false);
    }
  }

  function handleResultClose() {
    const wasSuccess = modal?.kind === 'result' && modal.variant === 'success';
    setModal(null);
    if (wasSuccess) navigation.goBack();
  }

  return (
    <MainLayout
      title="Sesi Berjalan"
      subtitle={
        session?.route
          ? `${session.route.name} · ${session.route.code}`
          : 'Patroli sedang berjalan'
      }
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : !session ? (
        <Text style={styles.empty}>
          {errorMessage ?? 'Tidak ada sesi patroli yang sedang berjalan.'}
        </Text>
      ) : (
        <View style={styles.flex}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => load('refresh')}
                tintColor={colors.primary}
              />
            }>
            <Card style={styles.card}>
              <View style={styles.statusHeader}>
                <Text style={styles.cardTitle}>Status Sesi</Text>
                <Badge label="Sedang Berjalan" variant="success" />
              </View>
              <View style={styles.tileRow}>
                <View style={styles.tile}>
                  <Text style={styles.tileLabel}>MULAI</Text>
                  <Text style={styles.tileValue}>{patrolClockLabel(session.started_at)} WIB</Text>
                  <Text style={styles.tileMeta}>{patrolDateLabel(session.started_at)}</Text>
                </View>
                <View style={styles.tile}>
                  <Text style={styles.tileLabel}>BERLANGSUNG</Text>
                  <Text style={styles.tileValue}>{patrolDurationLabel(session.started_at)}</Text>
                  <Text style={styles.tileMeta}>berjalan</Text>
                </View>
              </View>
              {session.route?.description ? (
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>DESKRIPSI RUTE</Text>
                  <Text style={styles.infoText}>{session.route.description}</Text>
                </View>
              ) : null}
              {session.notes ? (
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>CATATAN AWAL</Text>
                  <Text style={styles.infoText}>{session.notes}</Text>
                </View>
              ) : null}
            </Card>

            <Card style={styles.card}>
              <Text style={styles.sectionLabel}>PROGRES CHECKPOINT</Text>
              <View style={styles.progressRow}>
                <Text style={styles.progressBig}>
                  {session.completed_checkpoints}
                  <Text style={styles.progressBigMuted}> / {session.total_checkpoints}</Text>
                </Text>
                <Text style={styles.progressCaption}>checkpoint terverifikasi</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percent}%` }]} />
              </View>
              {nextCheckpoint ? (
                <Text style={styles.nextText}>
                  Checkpoint berikutnya: <Text style={styles.nextName}>{nextCheckpoint.name}</Text>
                </Text>
              ) : (
                <Text style={styles.nextText}>Semua checkpoint sudah terverifikasi.</Text>
              )}
            </Card>

            {checkpoints.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>LOG CHECKPOINT</Text>
                <Card style={styles.timelineCard}>
                  {checkpoints.map((checkpoint, index) => {
                    const isLast = index === checkpoints.length - 1;
                    const isDone = doneCheckpointIds.has(checkpoint.id);
                    const isNext = !isDone && checkpoint.id === nextCheckpoint?.id;
                    const log = isDone ? logForCheckpoint(session.logs, checkpoint) : undefined;
                    const time = log?.scanned_at ? patrolClockLabel(log.scanned_at) : null;
                    return (
                      <View key={checkpoint.id} style={styles.timelineRow}>
                        <View style={styles.timelineGutter}>
                          <View
                            style={[
                              styles.node,
                              isDone && styles.nodeDone,
                              isNext && styles.nodeNext,
                              !isDone && !isNext && styles.nodePending,
                            ]}>
                            {isDone ? (
                              <Icon name="check" size={13} color={colors.primaryForeground} />
                            ) : null}
                          </View>
                          {!isLast ? <View style={styles.connector} /> : null}
                        </View>
                        <PressableScale
                          scaleTo={isDone && log ? 0.98 : 1}
                          disabled={!isDone || !log}
                          onPress={() => log && setSelectedLog(log)}
                          style={styles.timelineBodyPress}
                          contentStyle={[
                            styles.timelineBody,
                            !isLast && styles.timelineBodyGap,
                          ]}>
                          <View style={styles.timelineTop}>
                            <Text
                              style={[styles.checkpointName, !isDone && !isNext && styles.mutedName]}>
                              {checkpoint.sequence_order}. {checkpoint.name}
                            </Text>
                            {time ? <Text style={styles.timeText}>{time}</Text> : null}
                            {isNext ? <Badge label="Berikutnya" variant="primary" /> : null}
                            {isDone ? (
                              <Icon name="chevron-right" size={16} color={colors.placeholder} />
                            ) : null}
                          </View>
                          <View style={styles.checkpointMeta}>
                            <CodeChip code={checkpoint.qr_code} />
                            {isDone ? (
                              <View style={styles.metaItem}>
                                <Icon name="qr-code" size={12} color={colors.textMuted} />
                                <Text style={styles.metaText}>
                                  {log?.is_valid_location === false ? 'Di luar radius' : 'Verifikasi QR'}
                                </Text>
                              </View>
                            ) : null}
                            {isDone && log?.distance_meters != null ? (
                              <View style={styles.metaItem}>
                                <Icon name="crosshair" size={12} color={colors.textMuted} />
                                <Text style={styles.metaText}>{log.distance_meters} m</Text>
                              </View>
                            ) : null}
                          </View>
                          <View style={styles.checkpointSubMeta}>
                            <Icon name="map-pin" size={12} color={colors.placeholder} />
                            <Text style={styles.checkpointSubText}>
                              {coordLabel(checkpoint.latitude, checkpoint.longitude)} · radius{' '}
                              {checkpoint.radius_meters} m
                            </Text>
                          </View>
                          {checkpoint.notes ? (
                            <Text style={styles.checkpointNote}>{checkpoint.notes}</Text>
                          ) : null}
                          {isNext ? (
                            <PressableScale
                              scaleTo={0.98}
                              onPress={() =>
                                navigation.navigate(ROUTES.patrolScan, {
                                  sessionId: session.id,
                                  routeName: session.route?.name,
                                  totalCheckpoints: session.total_checkpoints,
                                  nextCheckpoint: {
                                    name: checkpoint.name,
                                    qrCode: checkpoint.qr_code,
                                    sequenceOrder: checkpoint.sequence_order,
                                  },
                                })
                              }
                              contentStyle={styles.scanButton}>
                              <Icon name="qr-code" size={15} color={colors.primary} />
                              <Text style={styles.scanButtonText}>Scan QR Checkpoint</Text>
                            </PressableScale>
                          ) : null}
                        </PressableScale>
                      </View>
                    );
                  })}
                </Card>
              </>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {!allCheckpointsDone ? (
              <Text style={styles.footerHint}>
                {remainingCheckpoints} checkpoint lagi harus di-check-in sebelum patroli bisa
                diselesaikan.
              </Text>
            ) : null}
            <GradientButton
              label="Selesaikan Patroli"
              tone="success"
              icon="check"
              disabled={!allCheckpointsDone}
              onPress={() => setModal({ kind: 'confirm-complete' })}
            />
          </View>
        </View>
      )}

      <StatusModal
        visible={modal?.kind === 'confirm-complete'}
        variant="error"
        icon="error"
        title="Selesaikan Patroli?"
        message="Semua checkpoint sudah terverifikasi. Sesi patroli akan ditutup dan tidak dapat dilanjutkan lagi."
        onRequestClose={() => setModal(null)}
        primaryAction={{
          label: 'Selesaikan',
          onPress: () => {
            setModal(null);
            confirmComplete();
          },
        }}
        secondaryAction={{ label: 'Batal', onPress: () => setModal(null) }}
      />

      <StatusModal
        visible={modal?.kind === 'result'}
        variant={modal?.kind === 'result' ? modal.variant : 'success'}
        title={modal?.kind === 'result' ? modal.title : ''}
        message={modal?.kind === 'result' ? modal.message : ''}
        onRequestClose={handleResultClose}
        primaryAction={{ label: 'Selesai', onPress: handleResultClose }}
      />

      {isCompleting ? (
        <View style={styles.blockingLoader} pointerEvents="auto">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}

      <BottomSheet visible={selectedLog !== null} onRequestClose={() => setSelectedLog(null)}>
        {selectedLog ? (
          <View style={styles.logSheet}>
            <View style={styles.logSheetHead}>
              <View style={styles.logSheetIdentity}>
                <Text style={styles.logSheetTitle}>
                  {selectedLog.checkpoint?.sequence_order != null
                    ? `${selectedLog.checkpoint.sequence_order}. `
                    : ''}
                  {selectedLog.checkpoint?.name ?? 'Checkpoint'}
                </Text>
                {selectedLog.checkpoint?.qr_code ? (
                  <CodeChip code={selectedLog.checkpoint.qr_code} />
                ) : null}
              </View>
              <Badge
                label={selectedLog.is_valid_location === false ? 'Di luar radius' : 'Valid'}
                variant={selectedLog.is_valid_location === false ? 'warning' : 'success'}
              />
            </View>

            <View
              style={[
                styles.logPhotoWrap,
                selectedLogPhoto ? styles.logPhotoWrapPhoto : styles.logPhotoWrapEmpty,
              ]}
              onLayout={e => setLogPhotoWidth(e.nativeEvent.layout.width)}>
              {selectedLogPhoto ? (
                logPhotoWidth > 0 ? (
                  <SecureImage
                    path={selectedLogPhoto}
                    style={{ width: logPhotoWidth, height: logPhotoWidth } as ImageStyle}
                    resizeMode="cover"
                  />
                ) : null
              ) : (
                <View style={styles.logPhotoEmptyInner}>
                  <Icon name="camera" size={30} color={colors.placeholder} />
                  <Text style={styles.logPhotoEmptyText}>Foto selfie belum tersedia</Text>
                </View>
              )}
            </View>

            <View style={styles.logRows}>
              <LogRow
                icon="clock"
                label="Waktu check-in"
                value={
                  selectedLog.scanned_at
                    ? `${patrolClockLabel(selectedLog.scanned_at)} WIB · ${patrolDateLabel(selectedLog.scanned_at)}`
                    : '-'
                }
              />
              <LogRow
                icon="map-pin"
                label="Lokasi petugas"
                value={
                  selectedLog.scanned_latitude != null && selectedLog.scanned_longitude != null
                    ? coordLabel(selectedLog.scanned_latitude, selectedLog.scanned_longitude)
                    : '-'
                }
              />
              <LogRow
                icon="crosshair"
                label="Jarak ke checkpoint"
                value={
                  selectedLog.distance_meters != null ? `${selectedLog.distance_meters} m` : '-'
                }
              />
              {selectedLog.checkpoint?.latitude != null &&
              selectedLog.checkpoint?.longitude != null ? (
                <LogRow
                  icon="map-pin"
                  label="Titik checkpoint"
                  value={coordLabel(
                    selectedLog.checkpoint.latitude,
                    selectedLog.checkpoint.longitude,
                  )}
                />
              ) : null}
              {selectedLog.checkpoint?.radius_meters != null ? (
                <LogRow
                  icon="crosshair"
                  label="Radius checkpoint"
                  value={`${selectedLog.checkpoint.radius_meters} m`}
                />
              ) : null}
              {selectedLog.checkpoint?.notes ? (
                <LogRow icon="info" label="Info checkpoint" value={selectedLog.checkpoint.notes} />
              ) : null}
              {selectedLog.notes ? (
                <LogRow icon="file" label="Catatan check-in" value={selectedLog.notes} />
              ) : null}
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </MainLayout>
  );
}

function LogRow(props: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.logRow}>
      <Icon name={props.icon} size={16} color={colors.textMuted} />
      <Text style={styles.logRowLabel}>{props.label}</Text>
      <Text style={styles.logRowValue}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  empty: { marginTop: 32, textAlign: 'center', fontSize: 14, color: colors.textMuted },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 120, gap: 16 },
  card: { gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileRow: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  tileLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 },
  tileValue: { fontSize: 15, fontWeight: '800', color: colors.heading },
  tileMeta: { fontSize: 11, color: colors.placeholder },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.primary, letterSpacing: 0.4 },
  infoBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 10,
    gap: 3,
  },
  infoLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.3 },
  infoText: { fontSize: 13, color: colors.heading, lineHeight: 19 },
  progressRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  progressBig: { fontSize: 34, fontWeight: '800', letterSpacing: -1, color: colors.success, lineHeight: 36 },
  progressBigMuted: { fontSize: 18, color: colors.placeholder },
  progressCaption: { fontSize: 12, color: colors.textMuted, paddingBottom: 5 },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.success },
  nextText: { fontSize: 12, color: colors.textMuted },
  nextName: { fontWeight: '700', color: colors.heading },
  timelineCard: { paddingBottom: 4 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineGutter: { alignItems: 'center' },
  node: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  nodeDone: { backgroundColor: colors.success },
  nodeNext: { borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: colors.primaryTintSurface },
  nodePending: { borderColor: colors.border },
  connector: { width: 2, flex: 1, backgroundColor: colors.borderSoft, marginTop: 4 },
  timelineBodyPress: { flex: 1 },
  timelineBody: { flex: 1, gap: 6 },
  timelineBodyGap: { paddingBottom: 16 },
  timelineTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkpointName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.heading },
  mutedName: { color: colors.placeholder },
  timeText: { fontSize: 12, fontWeight: '700', color: colors.success },
  checkpointMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.textMuted },
  checkpointSubMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkpointSubText: { flex: 1, fontSize: 11, color: colors.placeholder },
  checkpointNote: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySurface,
  },
  scanButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  footerHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  blockingLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  logSheet: { gap: 16, paddingBottom: 8 },
  logSheetHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  logSheetIdentity: { flex: 1, gap: 6, alignItems: 'flex-start' },
  logSheetTitle: { fontSize: 17, fontWeight: '800', color: colors.heading },
  logPhotoWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.chipSurface,
  },
  logPhotoWrapPhoto: { aspectRatio: 1 },
  logPhotoWrapEmpty: { aspectRatio: 16 / 10 },
  logPhotoFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  logPhotoEmptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logPhotoEmptyText: { fontSize: 12, color: colors.textMuted },
  logRows: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  logRowLabel: { flex: 1, fontSize: 13, color: colors.textMuted },
  logRowValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.heading,
    textAlign: 'right',
  },
});
