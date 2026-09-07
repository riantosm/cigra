import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ImageStyle } from 'react-native-fast-image';

import Badge from '@/components/atoms/Badge';
import CodeChip from '@/components/atoms/CodeChip';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import Card from '@/components/molecules/Card';
import BottomSheet from '@/components/organisms/BottomSheet';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getPatrolSessionApi } from '@/services/api/patrol.service';
import { colors } from '@/theme/colors';
import type { PatrolCheckpoint, PatrolCheckpointLog, PatrolSession } from '@/types';
import { joinFields } from '@/utils/format';
import {
  coordLabel,
  patrolClockLabel,
  patrolDateLabel,
  patrolMinutesLabel,
  patrolProgressPercent,
} from '@/utils/patrol';

type Props = RootStackScreenProps<typeof ROUTES.patrolMonitoringDetail>;

// Satu baris timeline checkpoint — sudah / belum di-check-in.
type CheckpointRow = {
  id: number;
  name: string;
  sequenceOrder: number;
  qrCode: string;
  cpLat?: number;
  cpLng?: number;
  radius?: number;
  cpNotes?: string | null;
  done: boolean;
  scannedAt?: string;
  distanceMeters?: number | null;
  isValidLocation?: boolean;
  scannedLat?: number | null;
  scannedLng?: number | null;
  photo?: string | null;
  checkinNotes?: string | null;
};

function findLog(
  logs: PatrolCheckpointLog[] | undefined,
  checkpointId: number,
): PatrolCheckpointLog | undefined {
  return (logs ?? []).find(
    log => log.patrol_checkpoint_id === checkpointId || log.checkpoint?.id === checkpointId,
  );
}

function rowFromCheckpoint(
  checkpoint: PatrolCheckpoint,
  log: PatrolCheckpointLog | undefined,
): CheckpointRow {
  return {
    id: checkpoint.id,
    name: checkpoint.name,
    sequenceOrder: checkpoint.sequence_order,
    qrCode: checkpoint.qr_code,
    cpLat: checkpoint.latitude,
    cpLng: checkpoint.longitude,
    radius: checkpoint.radius_meters,
    cpNotes: checkpoint.notes,
    done: !!log,
    scannedAt: log?.scanned_at,
    distanceMeters: log?.distance_meters,
    isValidLocation: log?.is_valid_location,
    scannedLat: log?.scanned_latitude,
    scannedLng: log?.scanned_longitude,
    photo: log?.photo_url ?? log?.photo_path ?? null,
    checkinNotes: log?.notes,
  };
}

// Fallback kalau detail lengkap gagal dimuat — hanya checkpoint yang sudah punya log.
function rowsFromParamLogs(session: Props['route']['params']['session']): CheckpointRow[] {
  return [...session.logs]
    .sort((a, b) => (a.checkpoint.sequence_order ?? 0) - (b.checkpoint.sequence_order ?? 0))
    .map(log => ({
      id: log.checkpoint.id,
      name: log.checkpoint.name,
      sequenceOrder: log.checkpoint.sequence_order,
      qrCode: log.checkpoint.qr_code,
      done: true,
      scannedAt: log.scanned_at,
      distanceMeters: log.distance_meters,
      isValidLocation: log.is_valid_location,
      scannedLat: log.scanned_latitude,
      scannedLng: log.scanned_longitude,
      photo: log.photo_url ?? null,
      checkinNotes: log.notes,
    }));
}

export default function PatrolMonitoringDetailScreen(props: Props) {
  const { navigation, route } = props;
  const session = route.params.session;

  const [detail, setDetail] = useState<PatrolSession | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [selectedRow, setSelectedRow] = useState<CheckpointRow | null>(null);
  const [logPhotoWidth, setLogPhotoWidth] = useState(0);

  const loadDetail = useCallback(async () => {
    setIsLoadingDetail(true);
    try {
      setDetail(await getPatrolSessionApi(session.id));
    } catch {
      setDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [session.id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const isRunning = session.status === 'in_progress';
  const percent = patrolProgressPercent(session.completed_checkpoints, session.total_checkpoints);
  const officerName =
    joinFields(session.officer.rank ?? undefined, session.officer.full_name) ||
    session.officer.full_name;

  const rows = useMemo<CheckpointRow[]>(() => {
    const checkpoints = detail?.route?.checkpoints;
    if (checkpoints && checkpoints.length > 0) {
      return [...checkpoints]
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .map(cp => rowFromCheckpoint(cp, findLog(detail?.logs, cp.id)));
    }
    return rowsFromParamLogs(session);
  }, [detail, session]);

  const doneCount = rows.filter(r => r.done).length;
  const totalCount = rows.length || session.total_checkpoints;
  const selectedPhoto = selectedRow?.photo ?? null;

  return (
    <MainLayout
      title="Detail Patroli"
      subtitle={`${session.route.name} · ${session.route.code}`}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.statusHeader}>
            <View style={styles.officerBlock}>
              <Text style={styles.officerName}>{officerName}</Text>
              <Text style={styles.officerNrp}>NRP {session.officer.service_number}</Text>
            </View>
            <Badge
              label={isRunning ? 'Sedang Berjalan' : 'Selesai'}
              variant={isRunning ? 'success' : 'neutral'}
            />
          </View>

          <View style={styles.tileRow}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>MULAI</Text>
              <Text style={styles.tileValue}>{patrolClockLabel(session.started_at)} WIB</Text>
              <Text style={styles.tileMeta}>{patrolDateLabel(session.started_at)}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>{isRunning ? 'BERLANGSUNG' : 'DURASI'}</Text>
              <Text style={styles.tileValue}>
                {patrolMinutesLabel(session.duration_minutes)}
              </Text>
              <Text style={styles.tileMeta}>
                {session.completed_at
                  ? `selesai ${patrolClockLabel(session.completed_at)} WIB`
                  : 'berjalan'}
              </Text>
            </View>
          </View>

          {session.has_location_anomaly ? (
            <View style={styles.anomalyBanner}>
              <Icon name="alert-triangle" size={14} color={colors.warningText} />
              <Text style={styles.anomalyText}>
                Ada check-in yang tercatat di luar radius checkpoint.
              </Text>
            </View>
          ) : null}

          {session.notes ? (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>CATATAN PETUGAS</Text>
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
            <Text style={styles.progressCaption}>
              {Math.round(session.progress_percentage)}% checkpoint terverifikasi
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
        </Card>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>DAFTAR CHECKPOINT</Text>
          {rows.length > 0 ? (
            <Text style={styles.sectionCount}>
              {doneCount}/{totalCount} selesai
            </Text>
          ) : null}
        </View>

        {isLoadingDetail && rows.length === 0 ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : rows.length === 0 ? (
          <Card style={styles.card}>
            <Text style={styles.empty}>Belum ada data checkpoint.</Text>
          </Card>
        ) : (
          <Card style={styles.timelineCard}>
            {rows.map((row, index) => {
              const isLast = index === rows.length - 1;
              const outOfRadius = row.done && row.isValidLocation === false;
              return (
                <View key={row.id} style={styles.timelineRow}>
                  <View style={styles.timelineGutter}>
                    <View
                      style={[
                        styles.node,
                        row.done
                          ? outOfRadius
                            ? styles.nodeWarn
                            : styles.nodeDone
                          : styles.nodePending,
                      ]}>
                      {row.done ? (
                        <Icon
                          name={outOfRadius ? 'alert-triangle' : 'check'}
                          size={12}
                          color={colors.primaryForeground}
                        />
                      ) : null}
                    </View>
                    {!isLast ? <View style={styles.connector} /> : null}
                  </View>
                  <PressableScale
                    scaleTo={row.done ? 0.98 : 1}
                    disabled={!row.done}
                    onPress={() => row.done && setSelectedRow(row)}
                    style={styles.timelineBodyPress}
                    contentStyle={[styles.timelineBody, !isLast && styles.timelineBodyGap]}>
                    <View style={styles.timelineTop}>
                      <Text
                        style={[styles.checkpointName, !row.done && styles.checkpointNamePending]}>
                        {row.sequenceOrder}. {row.name}
                      </Text>
                      {row.done && row.scannedAt ? (
                        <Text style={styles.timeText}>{patrolClockLabel(row.scannedAt)}</Text>
                      ) : (
                        <Badge label="Belum" variant="neutral" />
                      )}
                      {row.done ? (
                        <Icon name="chevron-right" size={16} color={colors.placeholder} />
                      ) : null}
                    </View>
                    <View style={styles.checkpointMeta}>
                      <CodeChip code={row.qrCode} />
                      {row.done && row.distanceMeters != null ? (
                        <View style={styles.metaItem}>
                          <Icon name="crosshair" size={12} color={colors.textMuted} />
                          <Text style={styles.metaText}>{Math.round(row.distanceMeters)} m</Text>
                        </View>
                      ) : null}
                      {row.done ? (
                        <Badge
                          label={outOfRadius ? 'Di luar radius' : 'Valid'}
                          variant={outOfRadius ? 'warning' : 'success'}
                        />
                      ) : null}
                    </View>
                    {row.cpLat != null && row.cpLng != null ? (
                      <View style={styles.checkpointSubMeta}>
                        <Icon name="map-pin" size={12} color={colors.placeholder} />
                        <Text style={styles.checkpointSubText}>
                          {coordLabel(row.cpLat, row.cpLng)}
                          {row.radius != null ? ` · radius ${row.radius} m` : ''}
                        </Text>
                      </View>
                    ) : null}
                    {row.cpNotes ? (
                      <Text style={styles.checkpointNote}>{row.cpNotes}</Text>
                    ) : null}
                  </PressableScale>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>

      <BottomSheet visible={selectedRow !== null} onRequestClose={() => setSelectedRow(null)}>
        {selectedRow ? (
          <View style={styles.logSheet}>
            <View style={styles.logSheetHead}>
              <View style={styles.logSheetIdentity}>
                <Text style={styles.logSheetTitle}>
                  {selectedRow.sequenceOrder}. {selectedRow.name}
                </Text>
                <CodeChip code={selectedRow.qrCode} />
              </View>
              <Badge
                label={selectedRow.isValidLocation === false ? 'Di luar radius' : 'Valid'}
                variant={selectedRow.isValidLocation === false ? 'warning' : 'success'}
              />
            </View>

            <View
              style={[
                styles.logPhotoWrap,
                selectedPhoto ? styles.logPhotoWrapPhoto : styles.logPhotoWrapEmpty,
              ]}
              onLayout={e => setLogPhotoWidth(e.nativeEvent.layout.width)}>
              {selectedPhoto && logPhotoWidth > 0 ? (
                <SecureImage
                  path={selectedPhoto}
                  style={{ width: logPhotoWidth, height: logPhotoWidth } as ImageStyle}
                  resizeMode="cover"
                />
              ) : selectedPhoto ? null : (
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
                  selectedRow.scannedAt
                    ? `${patrolClockLabel(selectedRow.scannedAt)} WIB · ${patrolDateLabel(
                        selectedRow.scannedAt,
                      )}`
                    : '-'
                }
              />
              <LogRow
                icon="map-pin"
                label="Lokasi petugas"
                value={
                  selectedRow.scannedLat != null && selectedRow.scannedLng != null
                    ? coordLabel(selectedRow.scannedLat, selectedRow.scannedLng)
                    : '-'
                }
              />
              <LogRow
                icon="crosshair"
                label="Jarak ke checkpoint"
                value={
                  selectedRow.distanceMeters != null
                    ? `${Math.round(selectedRow.distanceMeters)} m`
                    : '-'
                }
              />
              {selectedRow.cpLat != null && selectedRow.cpLng != null ? (
                <LogRow
                  icon="map-pin"
                  label="Titik checkpoint"
                  value={coordLabel(selectedRow.cpLat, selectedRow.cpLng)}
                />
              ) : null}
              {selectedRow.radius != null ? (
                <LogRow
                  icon="crosshair"
                  label="Radius checkpoint"
                  value={`${selectedRow.radius} m`}
                />
              ) : null}
              {selectedRow.cpNotes ? (
                <LogRow icon="info" label="Info checkpoint" value={selectedRow.cpNotes} />
              ) : null}
              {selectedRow.checkinNotes ? (
                <LogRow icon="file" label="Catatan check-in" value={selectedRow.checkinNotes} />
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
  loader: { marginTop: 24 },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 48, gap: 16 },
  card: { gap: 12 },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  officerBlock: { flex: 1, gap: 2 },
  officerName: { fontSize: 15, fontWeight: '800', color: colors.heading },
  officerNrp: { fontSize: 12, color: colors.textMuted },
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
  anomalyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningSurface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  anomalyText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.warningText },
  infoBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 10,
    gap: 3,
  },
  infoLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.3 },
  infoText: { fontSize: 13, color: colors.heading, lineHeight: 19 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.primary, letterSpacing: 0.4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionCount: { fontSize: 12, color: colors.textMuted },
  progressRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  progressBig: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.success,
    lineHeight: 36,
  },
  progressBigMuted: { fontSize: 18, color: colors.placeholder },
  progressCaption: { fontSize: 12, color: colors.textMuted, paddingBottom: 5, flex: 1 },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.success },
  empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 8 },
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
  nodeWarn: { backgroundColor: colors.warning },
  nodePending: { borderColor: colors.border },
  connector: { width: 2, flex: 1, backgroundColor: colors.borderSoft, marginTop: 4 },
  timelineBodyPress: { flex: 1 },
  timelineBody: { flex: 1, gap: 6 },
  timelineBodyGap: { paddingBottom: 16 },
  timelineTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkpointName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.heading },
  checkpointNamePending: { color: colors.placeholder },
  timeText: { fontSize: 12, fontWeight: '700', color: colors.success },
  checkpointMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.textMuted },
  checkpointSubMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkpointSubText: { flex: 1, fontSize: 11, color: colors.placeholder },
  checkpointNote: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
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
  logPhotoEmptyInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  logPhotoEmptyText: { fontSize: 12, color: colors.textMuted },
  logRows: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  logRowLabel: { flex: 1, fontSize: 13, color: colors.textMuted },
  logRowValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.heading,
    textAlign: 'right',
  },
});
