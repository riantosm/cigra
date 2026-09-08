import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import InfoRow from '@/components/molecules/InfoRow';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { completeDispositionApi, getDispositionApi } from '@/services/api/disposition.service';
import { colors } from '@/theme/colors';
import { cardShadow, tabBarShadow } from '@/theme/shadows';
import type { DispositionDetail } from '@/types';
import { extractErrorMessage, formatDateTime } from '@/utils/format';
import { downloadSecureFile } from '@/utils/secureFileDownload';
import {
  dispositionStatusBadgeVariant,
  dispositionStatusLabel,
  letterDateLabel,
  priorityBadgeVariant,
  priorityLabel,
  recipientStatusBadgeVariant,
  recipientStatusLabel,
} from '@/utils/disposition';

type Props = RootStackScreenProps<typeof ROUTES.dispositionDetail>;

export default function DispositionDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { id } = route.params;

  const [detail, setDetail] = useState<DispositionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [modal, setModal] = useState<{ variant: 'success' | 'error'; title: string; message: string } | null>(
    null,
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      setErrorMessage(null);
      try {
        setDetail(await getDispositionApi(id));
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat detail disposisi.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id],
  );

  const isFirstLoad = useRef(true);
  useEffect(() => {
    load('initial');
  }, [load]);

  // Segarkan saat kembali (mis. setelah menambah tindak lanjut).
  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }
      load('refresh');
    }, [load]),
  );

  async function openFile(url: string | null | undefined, baseName: string) {
    if (!url || isDownloading) return;
    setIsDownloading(true);
    try {
      const result = await downloadSecureFile(url, baseName);
      setModal({
        variant: 'success',
        title: 'Berkas Diunduh',
        message: result.toDownloads
          ? 'Berkas tersimpan di folder Unduhan.'
          : 'Berkas dibuka. Simpan lewat menu bagikan.',
      });
    } catch (error) {
      setModal({ variant: 'error', title: 'Gagal Mengunduh', message: extractErrorMessage(error, 'Gagal mengunduh berkas.') });
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleComplete() {
    setIsCompleting(true);
    try {
      const message = await completeDispositionApi(id);
      setConfirmComplete(false);
      try {
        setDetail(await getDispositionApi(id));
      } catch {
        // refresh gagal bukan berarti aksi gagal
      }
      setModal({ variant: 'success', title: 'Ditandai Selesai', message });
    } catch (error) {
      setConfirmComplete(false);
      setModal({ variant: 'error', title: 'Gagal', message: extractErrorMessage(error, 'Gagal menandai selesai.') });
    } finally {
      setIsCompleting(false);
    }
  }

  const letter = detail?.incoming_letter;
  // Sembunyikan tombol aksi kalau bagian user (atau disposisi) sudah selesai / diarsipkan.
  const isDone =
    detail?.status === 'completed' ||
    detail?.status === 'archived' ||
    detail?.my_recipient_status === 'completed';
  const showFollowUp = detail?.permissions.can_follow_up && !isDone;
  const showComplete = detail?.permissions.can_complete && !isDone;

  return (
    <MainLayout
      title="Detail Disposisi"
      subtitle={detail?.disposition_number ?? `#${id}`}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : !detail ? (
        <Text style={styles.empty}>{errorMessage ?? 'Data tidak ditemukan.'}</Text>
      ) : (
        <View style={styles.flex}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.content,
              (showFollowUp || showComplete) && styles.contentWithFooter,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
            }>
            {/* Kartu instruksi */}
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.code}>{detail.disposition_number}</Text>
                <View style={styles.badges}>
                  {detail.priority ? (
                    <Badge label={priorityLabel[detail.priority]} variant={priorityBadgeVariant[detail.priority]} />
                  ) : null}
                  <Badge
                    label={detail.status_label || dispositionStatusLabel[detail.status]}
                    variant={dispositionStatusBadgeVariant[detail.status] ?? 'neutral'}
                  />
                </View>
              </View>
              <Text style={styles.sectionLabel}>INSTRUKSI DISPOSISI</Text>
              <Text style={styles.instruction}>{detail.instruction}</Text>
              {detail.notes ? (
                <View style={styles.noteBox}>
                  <Icon name="alert-triangle" size={16} color={colors.warningText} />
                  <View style={styles.noteBody}>
                    <Text style={styles.noteLabel}>CATATAN PENGIRIM</Text>
                    <Text style={styles.noteText}>{detail.notes}</Text>
                  </View>
                </View>
              ) : null}
              {detail.deadline ? (
                <View style={styles.deadlineBox}>
                  <Icon name="clock" size={15} color={colors.danger} />
                  <Text style={styles.deadlineLabel}>Tenggat penyelesaian</Text>
                  <Text style={styles.deadlineValue}>{letterDateLabel(detail.deadline)}</Text>
                </View>
              ) : null}
            </Card>

            {/* Pengirim */}
            <Card style={styles.card}>
              <Text style={styles.sectionLabel}>PENGIRIM DISPOSISI</Text>
              <View style={styles.senderRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(detail.sender.name.charAt(0) || '?').toUpperCase()}</Text>
                </View>
                <View style={styles.senderBody}>
                  <Text style={styles.senderName}>{detail.sender.name}</Text>
                  {detail.sender.position ? (
                    <Text style={styles.senderMeta}>{detail.sender.position}</Text>
                  ) : null}
                </View>
              </View>
            </Card>

            {/* Surat masuk */}
            {letter ? (
              <Card style={styles.card}>
                <Text style={styles.sectionLabel}>SURAT MASUK</Text>
                <InfoRow icon="file" label="Nomor Surat" value={letter.reference_number || '-'} />
                <InfoRow icon="calendar" label="No. Agenda" value={letter.agenda_number || '-'} />
                <InfoRow icon="building" label="Asal Surat" value={letter.sender || '-'} />
                <InfoRow icon="mail" label="Perihal" value={letter.subject || '-'} />
                {letter.file_url ? (
                  <PressableScale
                    scaleTo={0.98}
                    disabled={isDownloading}
                    onPress={() => openFile(letter.file_url, `surat-${letter.reference_number || letter.id}`)}
                    contentStyle={styles.fileButton}>
                    {isDownloading ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <Icon name="file" size={17} color={colors.primary} />
                    )}
                    <Text style={styles.fileButtonText}>Lihat Berkas Surat (PDF)</Text>
                  </PressableScale>
                ) : null}
              </Card>
            ) : null}

            {/* Penerima */}
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionLabel}>PENERIMA DISPOSISI</Text>
                <Text style={styles.countHint}>{detail.recipients.length} penerima</Text>
              </View>
              {detail.recipients.length === 0 ? (
                <Text style={styles.emptyRow}>Belum ada data penerima.</Text>
              ) : (
                detail.recipients.map((r, index) => (
                  <View
                    key={r.id}
                    style={[styles.recipientRow, index < detail.recipients.length - 1 && styles.recipientDivider]}>
                    <View style={[styles.recipientAvatar]}>
                      <Text style={styles.recipientAvatarText}>
                        {(r.personnel_name.charAt(0) || '?').toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.recipientBody}>
                      <Text style={styles.recipientName} numberOfLines={1}>
                        {r.personnel_name}
                      </Text>
                      <Text style={styles.recipientMeta}>
                        {r.read_at ? `Dibaca ${formatDateTime(r.read_at)}` : 'Belum dibaca'}
                      </Text>
                    </View>
                    <Badge
                      label={recipientStatusLabel[r.status] ?? r.status}
                      variant={recipientStatusBadgeVariant[r.status] ?? 'neutral'}
                    />
                  </View>
                ))
              )}
            </Card>

            {/* Riwayat tindak lanjut */}
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionLabel}>RIWAYAT TINDAK LANJUT</Text>
                <Text style={styles.countHint}>{detail.follow_ups.length} catatan</Text>
              </View>
              {detail.follow_ups.length === 0 ? (
                <Text style={styles.emptyRow}>Belum ada tindak lanjut.</Text>
              ) : (
                detail.follow_ups.map((f, index) => (
                  <View key={f.id} style={styles.timelineRow}>
                    <View style={styles.timelineGutter}>
                      <View style={[styles.timelineDot, index === 0 && styles.timelineDotActive]} />
                      {index < detail.follow_ups.length - 1 ? <View style={styles.timelineLine} /> : null}
                    </View>
                    <View style={styles.timelineBody}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.timelineName}>{f.user_name}</Text>
                        <Text style={styles.timelineTime}>{formatDateTime(f.created_at)}</Text>
                      </View>
                      <Text style={styles.timelineNotes}>{f.notes}</Text>
                      {f.attachment_url ? (
                        <PressableScale
                          scaleTo={0.97}
                          disabled={isDownloading}
                          onPress={() => openFile(f.attachment_url, `tindak-lanjut-${f.id}`)}
                          contentStyle={styles.attachmentChip}>
                          <Icon name="paperclip" size={13} color={colors.primary} />
                          <Text style={styles.attachmentChipText}>Lihat lampiran</Text>
                          <Icon name="download" size={13} color={colors.primary} />
                        </PressableScale>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </Card>
          </ScrollView>

          {showFollowUp || showComplete ? (
            <View style={styles.footer}>
              {showFollowUp ? (
                <PressableScale
                  scaleTo={0.97}
                  onPress={() =>
                    navigation.navigate(ROUTES.dispositionFollowUp, {
                      id,
                      dispositionNumber: detail.disposition_number,
                      subject: letter?.subject,
                    })
                  }
                  contentStyle={styles.secondaryButton}>
                  <Icon name="edit" size={16} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>Tindak Lanjut</Text>
                </PressableScale>
              ) : null}
              {showComplete ? (
                <GradientButton
                  label="Tandai Selesai"
                  icon="check"
                  height={52}
                  style={styles.completeButton}
                  onPress={() => setConfirmComplete(true)}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      )}

      <StatusModal
        visible={confirmComplete}
        variant="success"
        icon="success"
        title="Tandai Disposisi Selesai?"
        message="Status Anda pada disposisi ini akan menjadi Selesai. Bila seluruh penerima telah menyelesaikan, disposisi otomatis ditutup."
        onRequestClose={() => setConfirmComplete(false)}
        primaryAction={{ label: isCompleting ? 'Memproses...' : 'Tandai Selesai', onPress: handleComplete }}
        secondaryAction={{ label: 'Batal', onPress: () => setConfirmComplete(false) }}
      />

      <StatusModal
        visible={modal !== null}
        variant={modal?.variant ?? 'success'}
        title={modal?.title ?? ''}
        message={modal?.message ?? ''}
        onRequestClose={() => setModal(null)}
        primaryAction={{ label: 'Tutup', onPress: () => setModal(null) }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  empty: { marginTop: 32, textAlign: 'center', fontSize: 14, color: colors.textMuted },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 14 },
  contentWithFooter: { paddingBottom: 110 },
  card: { gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  code: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textMuted,
    backgroundColor: colors.neutralSurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    overflow: 'hidden',
  },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 1 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  instruction: { fontSize: 15, fontWeight: '600', color: colors.heading, lineHeight: 21 },
  noteBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.academyWarnSurface,
    borderWidth: 1,
    borderColor: colors.academyWarnBorder,
    borderRadius: 12,
    padding: 10,
  },
  noteBody: { flex: 1, gap: 2 },
  noteLabel: { fontSize: 11, fontWeight: '700', color: colors.warningText, letterSpacing: 0.3 },
  noteText: { fontSize: 13, color: colors.warningText, lineHeight: 18 },
  deadlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSurfaceSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  deadlineLabel: { flex: 1, fontSize: 12, color: colors.textMuted },
  deadlineValue: { fontSize: 13, fontWeight: '700', color: colors.dangerText },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: colors.primaryForeground },
  senderBody: { flex: 1, gap: 2 },
  senderName: { fontSize: 15, fontWeight: '700', color: colors.heading },
  senderMeta: { fontSize: 12, color: colors.textMuted },
  fileButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  fileButtonText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  countHint: { fontSize: 12, color: colors.textMuted },
  emptyRow: { fontSize: 13, color: colors.textMuted },
  recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  recipientDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  recipientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  recipientAvatarText: { fontSize: 13, fontWeight: '700', color: colors.primaryForeground },
  recipientBody: { flex: 1, gap: 2 },
  recipientName: { fontSize: 13, fontWeight: '700', color: colors.heading },
  recipientMeta: { fontSize: 11, color: colors.textMuted },
  timelineRow: { flexDirection: 'row', gap: 10 },
  timelineGutter: { alignItems: 'center', width: 10 },
  timelineDot: { width: 9, height: 9, borderRadius: 999, marginTop: 4, backgroundColor: colors.placeholder },
  timelineDotActive: { backgroundColor: colors.primary },
  timelineLine: { flex: 1, width: 2, marginTop: 4, backgroundColor: colors.borderSoft },
  timelineBody: { flex: 1, gap: 3, paddingBottom: 10 },
  timelineName: { fontSize: 13, fontWeight: '700', color: colors.heading },
  timelineTime: { fontSize: 11, color: colors.placeholder },
  timelineNotes: { fontSize: 13, color: colors.textBody, lineHeight: 18 },
  attachmentChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.attachmentRowSurface,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  attachmentChipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '600', color: colors.heading },
  completeButton: { flex: 1 },
});
