import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import PersonAvatar from '@/components/molecules/PersonAvatar';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getAbsenceReasonsApi, submitRollCallEntryApi } from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import { smallButtonShadow, tabBarShadow } from '@/theme/shadows';
import type { AbsenceReason, RollCallEntryStatus } from '@/types';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.rollCallEntry>;

// Suatu keterangan dianggap "lainnya" (butuh catatan teks bebas) kalau namanya mengandung "lain".
function isOtherReason(reason: AbsenceReason): boolean {
  return /lain/i.test(reason.name);
}

export default function RollCallEntryScreen(props: Props) {
  const { navigation, route } = props;
  const { sessionId, personnelId, personnelName, personnelPhoto, serviceNumber } = route.params;
  const keyboardHeight = useKeyboardHeight();

  const [status, setStatus] = useState<RollCallEntryStatus>(route.params.status);
  const [reasons, setReasons] = useState<AbsenceReason[]>([]);
  const [reasonId, setReasonId] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<{ variant: 'success' | 'error'; title: string; message: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setReasons(await getAbsenceReasonsApi());
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Gagal memuat daftar keterangan.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedReason = useMemo(
    () => reasons.find(r => r.id === reasonId) ?? null,
    [reasons, reasonId],
  );
  const showNote = status === 'absent' && selectedReason != null && isOtherReason(selectedReason);

  async function handleSubmit() {
    setFormError(null);

    if (status === 'absent') {
      if (reasonId == null) {
        setFormError('Pilih keterangan ketidakhadiran terlebih dahulu.');
        return;
      }
      if (showNote && !note.trim()) {
        setFormError('Tulis keterangan pada kolom catatan.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await submitRollCallEntryApi(sessionId, {
        personnel_id: personnelId,
        status,
        ...(status === 'absent' && reasonId != null ? { absence_reason_id: reasonId } : null),
        ...(note.trim() ? { note: note.trim() } : null),
      });
      setResult({
        variant: 'success',
        title: 'Kehadiran Disimpan',
        message: `Status ${personnelName} berhasil dicatat.`,
      });
    } catch (error) {
      setResult({
        variant: 'error',
        title: 'Gagal Menyimpan',
        message: extractErrorMessage(error, 'Terjadi kesalahan saat menyimpan kehadiran.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleResultClose() {
    const wasSuccess = result?.variant === 'success';
    setResult(null);
    if (wasSuccess) navigation.goBack();
  }

  return (
    <MainLayout
      title="Keterangan Absen"
      subtitle={serviceNumber ? `${personnelName} · NRP ${serviceNumber}` : personnelName}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}>
            <View style={styles.identityCard}>
              <PersonAvatar photo={personnelPhoto} name={personnelName} size={48} />
              <View style={styles.identityBody}>
                <Text style={styles.identityName} numberOfLines={1}>
                  {personnelName}
                </Text>
                {serviceNumber ? (
                  <Text style={styles.identityMeta}>NRP {serviceNumber}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.fieldHead}>
                <View style={styles.fieldChip}>
                  <Icon name="shield-check" size={15} color={colors.primary} />
                </View>
                <Text style={styles.fieldLabel}>Status Kehadiran</Text>
              </View>
              <View style={styles.segment}>
                {(['present', 'absent'] as RollCallEntryStatus[]).map(key => {
                  const active = key === status;
                  return (
                    <PressableScale
                      key={key}
                      scaleTo={0.97}
                      onPress={() => setStatus(key)}
                      style={styles.segmentWrap}
                      contentStyle={[
                        styles.segmentItem,
                        active && (key === 'present' ? styles.segmentPresent : styles.segmentAbsent),
                      ]}>
                      <Text
                        style={[
                          styles.segmentText,
                          active && (key === 'present' ? styles.segmentTextPresent : styles.segmentTextAbsent),
                        ]}>
                        {key === 'present' ? 'Hadir' : 'Tidak Hadir'}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>

              {status === 'absent' ? (
                <>
                  <View style={[styles.fieldHead, styles.fieldHeadSpaced]}>
                    <View style={styles.fieldChip}>
                      <Icon name="flag" size={15} color={colors.primary} />
                    </View>
                    <Text style={styles.fieldLabel}>Keterangan</Text>
                    <Text style={styles.required}>Wajib</Text>
                  </View>
                  {reasons.length === 0 ? (
                    <Text style={styles.reasonEmpty}>Daftar keterangan belum tersedia.</Text>
                  ) : (
                    <>
                      <View style={styles.chipRow}>
                        {reasons.map(reason => {
                          const active = reason.id === reasonId;
                          return (
                            <PressableScale
                              key={reason.id}
                              scaleTo={0.96}
                              onPress={() => setReasonId(reason.id)}
                              contentStyle={[styles.reasonChip, active && styles.reasonChipActive]}>
                              <Text style={[styles.reasonChipText, active && styles.reasonChipTextActive]}>
                                {reason.name}
                              </Text>
                            </PressableScale>
                          );
                        })}
                      </View>
                      {selectedReason?.description ? (
                        <Text style={styles.reasonDescription}>{selectedReason.description}</Text>
                      ) : null}
                      <Text style={styles.reasonHint}>
                        Memilih “Lainnya” memunculkan kolom teks keterangan bebas.
                      </Text>
                    </>
                  )}

                  {showNote ? (
                    <View style={styles.noteBlock}>
                      <Text style={styles.noteLabel}>Tulis keterangan lainnya</Text>
                      <TextField
                        placeholder="Keterangan ketidakhadiran"
                        value={note}
                        onChangeText={setNote}
                        multiline
                        numberOfLines={3}
                        style={[styles.noteInput]}
                      />
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <GradientButton label="Simpan Kehadiran" onPress={handleSubmit} loading={isSubmitting} />
          </View>
        </View>
      )}

      <StatusModal
        visible={result !== null}
        variant={result?.variant ?? 'success'}
        title={result?.title ?? ''}
        message={result?.message ?? ''}
        onRequestClose={handleResultClose}
        primaryAction={{
          label: result?.variant === 'success' ? 'Selesai' : 'Tutup',
          onPress: handleResultClose,
        }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  content: { padding: 20, paddingBottom: 24, gap: 14 },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...smallButtonShadow,
  },
  identityBody: { flex: 1, gap: 2 },
  identityName: { fontSize: 16, fontWeight: '700', color: colors.heading },
  identityMeta: { fontSize: 12, color: colors.textMuted },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
    ...smallButtonShadow,
  },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldHeadSpaced: { marginTop: 4 },
  fieldChip: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
  },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  required: { fontSize: 11, fontWeight: '600', color: colors.danger },
  segment: { flexDirection: 'row', gap: 4, backgroundColor: colors.neutralSurface, borderRadius: 12, padding: 4 },
  segmentWrap: { flex: 1 },
  segmentItem: { paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segmentPresent: {
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentAbsent: {
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  segmentTextPresent: { color: colors.success, fontWeight: '700' },
  segmentTextAbsent: { color: colors.danger, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  reasonChipActive: { backgroundColor: colors.chipSurface, borderColor: colors.primarySurface },
  reasonChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  reasonChipTextActive: { color: colors.primary },
  reasonEmpty: { fontSize: 13, color: colors.textMuted },
  reasonDescription: { fontSize: 12, lineHeight: 17, color: colors.placeholder, marginTop: 10 },
  reasonHint: { fontSize: 11, lineHeight: 16, color: colors.textFaint, marginTop: 10 },
  noteBlock: { gap: 6, marginTop: 4 },
  noteLabel: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  noteInput: {
    minHeight: 80,
    borderRadius: 14,
    borderColor: colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.heading,
    textAlignVertical: 'top',
    ...smallButtonShadow,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  error: { fontSize: 13, color: colors.danger },
});
