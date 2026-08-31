import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import PersonAvatar from '@/components/molecules/PersonAvatar';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getHealthRecordDetailApi } from '@/services/api/health.service';
import { colors } from '@/theme/colors';
import type { HealthRecordDetail } from '@/types';
import { extractErrorMessage, formatDateTime, joinFields, orDash } from '@/utils/format';
import { downloadHealthAttachment } from '@/utils/healthAttachment';

type Props = RootStackScreenProps<typeof ROUTES.healthRecordDetail>;

// Detail satu pemeriksaan. Dapat dibuka petugas kesehatan maupun anggota (record miliknya sendiri).
// Kewenangan ditegakkan backend (403). Attachment diunduh lewat util healthAttachment.
export default function HealthRecordDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { recordId, record: prefetched, readOnly = false } = route.params;

  const [detail, setDetail] = useState<HealthRecordDetail | null>(prefetched ?? null);
  const [isLoading, setIsLoading] = useState(!prefetched);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [status, setStatus] = useState<
    { variant: 'success' | 'error'; title: string; message: string } | null
  >(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      // Anggota melihat record miliknya sendiri: backend menolak GET /health/records/{id}
      // (petugas-only), jadi pakai data yang sudah dibawa dari GET /health/my — jangan fetch.
      if (prefetched) {
        setDetail(prefetched);
        setIsLoading(false);
        return;
      }
      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);
      try {
        setDetail(await getHealthRecordDetailApi(recordId));
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat detail pemeriksaan.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [recordId, prefetched],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  // Setiap kembali ke layar ini (mis. setelah "Ubah Pemeriksaan" berhasil) → auto refresh,
  // lewati fokus pertama karena useEffect di atas sudah memuat saat mount. Tidak berlaku untuk
  // mode read-only (anggota) — endpoint detail-nya 403.
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      if (readOnly || prefetched) return;
      load('refresh');
    }, [load, readOnly, prefetched]),
  );

  async function handleDownload() {
    if (!detail) return;
    setIsDownloading(true);
    try {
      const baseName = `pemeriksaan-${detail.health_check_type}-${recordId}`;
      const res = await downloadHealthAttachment(recordId, baseName);
      setStatus({
        variant: 'success',
        title: 'Attachment Diunduh',
        message: res.toDownloads
          ? 'File tersimpan di folder Download perangkat.'
          : 'File berhasil diunduh.',
      });
    } catch (error) {
      setStatus({
        variant: 'error',
        title: 'Gagal Mengunduh',
        message: extractErrorMessage(error, 'Gagal mengunduh attachment. Coba lagi.'),
      });
    } finally {
      setIsDownloading(false);
    }
  }

  const person = detail?.personnel ?? null;

  return (
    <MainLayout title="Detail Pemeriksaan" onBack={() => navigation.goBack()}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : errorMessage || !detail ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{errorMessage ?? 'Detail tidak tersedia.'}</Text>
          {!readOnly && !prefetched ? (
            <Button label="Coba Lagi" variant="secondary" onPress={() => load('initial')} />
          ) : null}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            readOnly || prefetched ? undefined : (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => load('refresh')}
                tintColor={colors.primary}
              />
            )
          }>
          {person ? (
            <View style={styles.personCard}>
              <PersonAvatar photo={person.photo} name={person.full_name} size={48} />
              <View style={styles.personBody}>
                <Text style={styles.personName} numberOfLines={1}>
                  {joinFields(person.rank, person.full_name) || person.full_name}
                </Text>
                <Text style={styles.personMeta} numberOfLines={1}>
                  {joinFields(`NRP ${person.service_number}`, person.unit)}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <DetailRow label="Jenis Pemeriksaan" value={orDash(detail.health_check_type)} />
            <DetailRow label="Tanggal Pemeriksaan" value={formatDateTime(detail.examined_at) ?? '-'} />
            <DetailRow label="Hasil" value={orDash(detail.result)} />
            <DetailRow label="Catatan" value={orDash(detail.notes)} />
            <DetailRow label="Diperiksa oleh" value={orDash(detail.examined_by)} />
            {detail.updated_at ? (
              <DetailRow label="Terakhir diperbarui" value={formatDateTime(detail.updated_at) ?? '-'} last />
            ) : null}
          </View>

          <View style={styles.attachmentCard}>
            <View style={styles.attachmentHeader}>
              <Icon name="handbook" size={18} color={colors.primary} />
              <Text style={styles.attachmentTitle}>Attachment</Text>
            </View>
            {detail.attachment_url ? (
              <Button
                label="Unduh Attachment"
                variant="secondary"
                loading={isDownloading}
                onPress={handleDownload}
              />
            ) : (
              <Text style={styles.attachmentEmpty}>Tidak ada attachment pada pemeriksaan ini.</Text>
            )}
          </View>

          {detail.can_edit && !readOnly ? (
            <Button
              label="Ubah Pemeriksaan"
              onPress={() =>
                navigation.navigate(ROUTES.healthRecordInput, {
                  nrp: person?.service_number ?? String(detail.personnel_id ?? ''),
                  personnelName: person ? joinFields(person.rank, person.full_name) : undefined,
                  recordId: detail.id,
                })
              }
              style={styles.editButton}
            />
          ) : null}
        </ScrollView>
      )}

      <StatusModal
        visible={status !== null}
        variant={status?.variant ?? 'success'}
        title={status?.title ?? ''}
        message={status?.message ?? ''}
        onRequestClose={() => setStatus(null)}
        primaryAction={{ label: 'Tutup', onPress: () => setStatus(null) }}
      />
    </MainLayout>
  );
}

function DetailRow(props: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, props.last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{props.label}</Text>
      <Text style={styles.rowValue}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  personBody: { flex: 1, gap: 2 },
  personName: { fontSize: 15, fontWeight: '700', color: colors.text },
  personMeta: { fontSize: 12, color: colors.textMuted },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 3,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 12, color: colors.textMuted },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: '500' },
  attachmentCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  attachmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachmentTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  attachmentEmpty: { fontSize: 13, color: colors.textMuted },
  editButton: { marginTop: 24 },
  error: { fontSize: 13, color: colors.danger, textAlign: 'center' },
});
