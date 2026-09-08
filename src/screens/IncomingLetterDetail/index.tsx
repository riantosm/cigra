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
import { deleteDispositionApi, getIncomingLetterApi } from '@/services/api/disposition.service';
import { colors } from '@/theme/colors';
import { cardShadow, tabBarShadow } from '@/theme/shadows';
import type { IncomingLetterDetail, IncomingLetterDispositionRef } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { downloadSecureFile } from '@/utils/secureFileDownload';
import {
  dispositionStatusBadgeVariant,
  dispositionStatusLabel,
  letterDateLabel,
  securityLevelBadgeVariant,
  securityLevelLabel,
} from '@/utils/disposition';

type Props = RootStackScreenProps<typeof ROUTES.incomingLetterDetail>;

export default function IncomingLetterDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { id } = route.params;

  const [detail, setDetail] = useState<IncomingLetterDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<IncomingLetterDispositionRef | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modal, setModal] = useState<{ variant: 'success' | 'error'; title: string; message: string } | null>(
    null,
  );
  const isFirstLoad = useRef(true);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      setErrorMessage(null);
      try {
        setDetail(await getIncomingLetterApi(id));
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat detail surat masuk.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  // Segarkan saat kembali (mis. sesudah buat / ubah / hapus disposisi dari surat ini).
  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }
      load('refresh');
    }, [load]),
  );

  async function openFile() {
    if (!detail?.file_url || isDownloading) return;
    setIsDownloading(true);
    try {
      const result = await downloadSecureFile(detail.file_url, `surat-${detail.letter_number}`);
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

  function openDisposition(d: IncomingLetterDispositionRef) {
    if (d.status === 'draft') {
      navigation.navigate(ROUTES.dispositionCompose, { dispositionId: d.id });
    } else {
      navigation.navigate(ROUTES.dispositionDetail, { id: d.id });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      const message = await deleteDispositionApi(pendingDelete.id);
      setPendingDelete(null);
      setModal({ variant: 'success', title: 'Draf Dihapus', message });
      load('refresh');
    } catch (error) {
      setPendingDelete(null);
      setModal({ variant: 'error', title: 'Gagal Menghapus', message: extractErrorMessage(error, 'Gagal menghapus draf.') });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <MainLayout
      title="Detail Surat Masuk"
      subtitle={detail?.letter_number ?? `#${id}`}
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
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
            }>
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.code}>{detail.letter_number}</Text>
                <Badge
                  label={securityLevelLabel[detail.security_level]}
                  variant={securityLevelBadgeVariant[detail.security_level] ?? 'neutral'}
                />
              </View>
              <Text style={styles.subject}>{detail.subject}</Text>
              {detail.summary ? <Text style={styles.summary}>{detail.summary}</Text> : null}
              <InfoRow icon="calendar" label="No. Agenda" value={detail.agenda_number || '-'} />
              <InfoRow icon="building" label="Asal Surat" value={detail.source_sender || '-'} />
              <InfoRow icon="calendar" label="Tgl Surat" value={letterDateLabel(detail.letter_date)} />
              <InfoRow icon="calendar" label="Tgl Diterima" value={letterDateLabel(detail.received_date)} />
              {detail.file_url ? (
                <PressableScale
                  scaleTo={0.98}
                  disabled={isDownloading}
                  onPress={openFile}
                  contentStyle={styles.fileButton}>
                  {isDownloading ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Icon name="file" size={17} color={colors.primary} />
                  )}
                  <Text style={styles.fileButtonText}>Lihat Berkas Surat</Text>
                </PressableScale>
              ) : null}
            </Card>

            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionLabel}>RIWAYAT DISPOSISI</Text>
                <Text style={styles.countHint}>{detail.dispositions.length} disposisi</Text>
              </View>
              {detail.dispositions.length === 0 ? (
                <Text style={styles.emptyRow}>Surat ini belum pernah didisposisikan.</Text>
              ) : (
                detail.dispositions.map((d, index) => {
                  const isDraft = d.status === 'draft';
                  return (
                    <PressableScale
                      key={d.id}
                      scaleTo={0.98}
                      onPress={() => openDisposition(d)}
                      contentStyle={[
                        styles.dispRow,
                        index < detail.dispositions.length - 1 && styles.dispDivider,
                      ]}>
                      <View style={styles.dispHead}>
                        <Text style={styles.dispCode}>
                          {d.disposition_number ?? `Disposisi #${d.id}`}
                        </Text>
                        <Badge
                          label={
                            d.status_label ||
                            (d.status ? dispositionStatusLabel[d.status] : 'Disposisi')
                          }
                          variant={
                            (d.status && dispositionStatusBadgeVariant[d.status]) || 'neutral'
                          }
                        />
                      </View>
                      {d.instruction ? (
                        <Text style={styles.dispInstr} numberOfLines={2}>
                          &ldquo;{d.instruction}&rdquo;
                        </Text>
                      ) : null}
                      {(d.recipients_summary || d.recipient_names?.length || d.created_at) && (
                        <Text style={styles.dispMeta}>
                          {[
                            d.recipients_summary ??
                              (d.recipient_names?.length ? `Ke: ${d.recipient_names.join(', ')}` : null),
                            d.created_at ? letterDateLabel(d.created_at) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      )}
                      <View style={styles.dispActions}>
                        <Text style={styles.dispOpen}>
                          {isDraft ? 'Lanjutkan draf' : 'Lihat detail'}
                        </Text>
                        {isDraft ? (
                          <PressableScale
                            scaleTo={0.95}
                            onPress={() => setPendingDelete(d)}
                            contentStyle={styles.dispDelete}>
                            <Icon name="trash" size={13} color={colors.danger} />
                            <Text style={styles.dispDeleteText}>Hapus</Text>
                          </PressableScale>
                        ) : (
                          <Icon name="chevron-right" size={15} color={colors.primary} />
                        )}
                      </View>
                    </PressableScale>
                  );
                })
              )}
            </Card>
          </ScrollView>

          <View style={styles.footer}>
            <GradientButton
              label="Buat Disposisi dari Surat Ini"
              icon="send"
              onPress={() =>
                navigation.navigate(ROUTES.dispositionCompose, {
                  incomingLetter: {
                    id: detail.id,
                    letter_number: detail.letter_number,
                    subject: detail.subject,
                  },
                })
              }
            />
          </View>
        </View>
      )}

      <StatusModal
        visible={pendingDelete !== null}
        variant="error"
        title="Hapus Draf Disposisi?"
        message={`Draf ${pendingDelete?.disposition_number ?? `#${pendingDelete?.id ?? ''}`} akan dihapus permanen.`}
        onRequestClose={() => setPendingDelete(null)}
        primaryAction={{ label: isDeleting ? 'Menghapus...' : 'Hapus', onPress: confirmDelete }}
        secondaryAction={{ label: 'Batal', onPress: () => setPendingDelete(null) }}
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
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 110, gap: 14 },
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
  subject: { fontSize: 16, fontWeight: '700', color: colors.heading, lineHeight: 22 },
  summary: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
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
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.primary, letterSpacing: 0.4 },
  countHint: { fontSize: 12, color: colors.textMuted },
  emptyRow: { fontSize: 13, color: colors.textMuted },
  dispRow: { gap: 6, paddingVertical: 10 },
  dispDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  dispHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dispCode: {
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
  dispInstr: { fontSize: 13, color: colors.textBody, lineHeight: 18 },
  dispMeta: { fontSize: 12, color: colors.textMuted },
  dispActions: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dispOpen: { fontSize: 12, fontWeight: '600', color: colors.primary },
  dispDelete: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dispDeleteText: { fontSize: 12, fontWeight: '600', color: colors.danger },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
});
