import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import DateTimeField from '@/components/molecules/DateTimeField';
import BottomSheet from '@/components/organisms/BottomSheet';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  createHealthRecordApi,
  getHealthCheckTypesApi,
  getHealthRecordDetailApi,
  updateHealthRecordApi,
} from '@/services/api/health.service';
import { colors } from '@/theme/colors';
import type { HealthCheckType } from '@/types';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.healthRecordInput>;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Format Date jadi ISO-8601 dengan offset zona waktu perangkat ("2026-08-28T10:00:00+07:00").
function toIsoWithOffset(d: Date): string {
  const tzMinutes = -d.getTimezoneOffset();
  const sign = tzMinutes >= 0 ? '+' : '-';
  const tzAbs = Math.abs(tzMinutes);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00` +
    `${sign}${pad(Math.floor(tzAbs / 60))}:${pad(tzAbs % 60)}`
  );
}

// Gabungkan bagian tanggal dari `base` dengan bagian jam/menit dari `time` (atau sebaliknya) —
// dipakai supaya picker "date" tidak mereset jam & picker "time" tidak mereset tanggal.
function mergeDate(base: Date, part: Date, take: 'date' | 'time'): Date {
  const next = new Date(base);
  if (take === 'date') {
    next.setFullYear(part.getFullYear(), part.getMonth(), part.getDate());
  } else {
    next.setHours(part.getHours(), part.getMinutes(), 0, 0);
  }
  return next;
}

export default function HealthRecordInputScreen(props: Props) {
  const { navigation, route } = props;
  const { nrp, personnelName, recordId } = route.params;
  const isEdit = recordId != null;
  const keyboardHeight = useKeyboardHeight();

  const [checkTypes, setCheckTypes] = useState<HealthCheckType[]>([]);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [examinedAt, setExaminedAt] = useState(() => new Date());
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTypeSheetVisible, setIsTypeSheetVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    { variant: 'success' | 'error'; title: string; message: string } | null
  >(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [types, detail] = await Promise.all([
        getHealthCheckTypesApi(),
        isEdit ? getHealthRecordDetailApi(recordId) : Promise.resolve(null),
      ]);
      setCheckTypes(types);
      if (detail) {
        const parsed = new Date(detail.examined_at);
        if (!Number.isNaN(parsed.getTime())) setExaminedAt(parsed);
        setResult(detail.result ?? '');
        setNotes(detail.notes ?? '');
        // Cocokkan jenis pemeriksaan berdasar nama (detail hanya kasih string, bukan id).
        const matched = types.find(t => t.name === detail.health_check_type);
        if (matched) setTypeId(matched.id);
      }
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Gagal memuat data form.'));
    } finally {
      setIsLoading(false);
    }
  }, [isEdit, recordId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedType = useMemo(
    () => checkTypes.find(t => t.id === typeId) ?? null,
    [checkTypes, typeId],
  );

  async function handleSubmit() {
    setFormError(null);
    if (typeId == null) {
      setFormError('Pilih jenis pemeriksaan terlebih dahulu.');
      return;
    }
    if (!result.trim()) {
      setFormError('Hasil pemeriksaan wajib diisi.');
      return;
    }
    if (examinedAt.getTime() > Date.now() + 60_000) {
      setFormError('Tanggal pemeriksaan tidak boleh di masa depan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        health_check_type_id: typeId,
        examined_at: toIsoWithOffset(examinedAt),
        result: result.trim(),
        notes: notes.trim() || undefined,
      };
      if (isEdit) {
        await updateHealthRecordApi(recordId, payload);
      } else {
        await createHealthRecordApi(nrp, payload);
      }
      setStatus({
        variant: 'success',
        title: isEdit ? 'Pemeriksaan Diperbarui' : 'Pemeriksaan Dicatat',
        message: isEdit
          ? 'Perubahan pemeriksaan berhasil disimpan.'
          : 'Hasil pemeriksaan kesehatan berhasil dicatat.',
      });
    } catch (error) {
      setStatus({
        variant: 'error',
        title: 'Gagal Menyimpan',
        message: extractErrorMessage(error, 'Terjadi kesalahan saat menyimpan pemeriksaan.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStatusClose() {
    const wasSuccess = status?.variant === 'success';
    setStatus(null);
    if (wasSuccess) navigation.goBack();
  }

  return (
    <MainLayout title={isEdit ? 'Ubah Pemeriksaan' : 'Input Pemeriksaan'} onBack={() => navigation.goBack()}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}>
            {personnelName ? (
            <View style={styles.personChip}>
              <Icon name="profile" size={14} color={colors.primary} />
              <Text style={styles.personChipText} numberOfLines={1}>
                {personnelName} · NRP {nrp}
              </Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Jenis Pemeriksaan</Text>
          <PressableScale
            scaleTo={0.98}
            onPress={() => setIsTypeSheetVisible(true)}
            contentStyle={styles.select}>
            <Text style={[styles.selectText, !selectedType && styles.selectPlaceholder]} numberOfLines={1}>
              {selectedType?.name ?? 'Pilih jenis pemeriksaan'}
            </Text>
            <Icon name="chevron-down" size={18} color={colors.textMuted} />
          </PressableScale>

          <View style={styles.dateTimeRow}>
            <DateTimeField
              label="Tanggal"
              mode="date"
              value={examinedAt}
              maximumDate={new Date()}
              onChange={next => setExaminedAt(current => mergeDate(current, next, 'date'))}
              containerStyle={styles.dateField}
            />
            <DateTimeField
              label="Waktu"
              mode="time"
              value={examinedAt}
              onChange={next => setExaminedAt(current => mergeDate(current, next, 'time'))}
              containerStyle={styles.timeField}
            />
          </View>
          <PressableScale onPress={() => setExaminedAt(new Date())}>
            <Text style={styles.nowLink}>Set ke waktu sekarang</Text>
          </PressableScale>

          <TextField
            label="Hasil Pemeriksaan"
            placeholder="mis. Sehat / Tekanan darah 120/80"
            value={result}
            onChangeText={setResult}
            containerStyle={styles.field}
          />

          <TextField
            label="Catatan (opsional)"
            placeholder="Catatan tambahan"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.notesInput}
            containerStyle={styles.field}
          />

          {isEdit ? (
            <Text style={styles.editHint}>
              Petugas hanya dapat mengubah pemeriksaan dalam 24 jam setelah pencatatan.
            </Text>
          ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Button
              label={isEdit ? 'Simpan Perubahan' : 'Catat Pemeriksaan'}
              onPress={handleSubmit}
              loading={isSubmitting}
            />
          </View>
        </View>
      )}

      <BottomSheet visible={isTypeSheetVisible} onRequestClose={() => setIsTypeSheetVisible(false)}>
        <Text style={styles.sheetTitle}>Jenis Pemeriksaan</Text>
        <View style={styles.sheetList}>
          {checkTypes.map(type => (
            <PressableScale
              key={type.id}
              scaleTo={0.98}
              onPress={() => {
                setTypeId(type.id);
                setIsTypeSheetVisible(false);
              }}
              contentStyle={[styles.sheetItem, type.id === typeId && styles.sheetItemActive]}>
              <View style={styles.sheetItemBody}>
                <Text style={styles.sheetItemName}>{type.name}</Text>
                {type.description ? (
                  <Text style={styles.sheetItemDesc}>{type.description}</Text>
                ) : null}
              </View>
              {type.id === typeId ? (
                <Icon name="shield-check" size={16} color={colors.primary} />
              ) : null}
            </PressableScale>
          ))}
          {checkTypes.length === 0 ? (
            <Text style={styles.sheetEmpty}>Belum ada jenis pemeriksaan.</Text>
          ) : null}
        </View>
      </BottomSheet>

      <StatusModal
        visible={status !== null}
        variant={status?.variant ?? 'success'}
        title={status?.title ?? ''}
        message={status?.message ?? ''}
        onRequestClose={handleStatusClose}
        primaryAction={{ label: status?.variant === 'success' ? 'Selesai' : 'Tutup', onPress: handleStatusClose }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Tombol submit dipin di bawah (di luar ScrollView). Wrapper-nya diberi paddingBottom =
  // tinggi keyboard (useKeyboardHeight) supaya footer + ScrollView terangkat ke atas keyboard.
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primarySurface,
    marginBottom: 20,
  },
  personChipText: { fontSize: 12, fontWeight: '600', color: colors.primary, flexShrink: 1 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginBottom: 6 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectText: { fontSize: 16, color: colors.text, flex: 1 },
  selectPlaceholder: { color: colors.textMuted },
  dateTimeRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  dateField: { flex: 2 },
  timeField: { flex: 1 },
  nowLink: { fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: 8 },
  field: { marginTop: 16 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  editHint: { fontSize: 12, color: colors.textMuted, marginTop: 16 },
  error: { fontSize: 13, color: colors.danger },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 },
  sheetList: { gap: 8 },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sheetItemActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  sheetItemBody: { flex: 1, gap: 2 },
  sheetItemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  sheetItemDesc: { fontSize: 12, color: colors.textMuted },
  sheetEmpty: { fontSize: 13, color: colors.textMuted, paddingVertical: 8 },
});
