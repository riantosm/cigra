import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import StatusModal from '@/components/organisms/StatusModal';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AcademyScreen from '@/screens/Academy/shared/AcademyScreen';
import {
  getAcademyPracticalAssessmentApi,
  submitAcademyPracticalResultApi,
} from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyPracticalAssessment } from '@/types';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.academyPracticalEntry>;

export default function AcademyPracticalEntryScreen(props: Props) {
  const { navigation, route } = props;
  const { practicalId, title } = route.params;

  const [config, setConfig] = useState<AcademyPracticalAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConfig(await getAcademyPracticalAssessmentApi(practicalId));
    } catch (e) {
      setError(extractErrorMessage(e, 'Data gagal dimuat.'));
    }
    setLoading(false);
  }, [practicalId]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = config?.metrics ?? [];
  const myResult = config?.my_result ?? null;
  const rejected = (myResult?.verification_status ?? '').toLowerCase() === 'rejected';
  // Belum kirim, atau sudah ditolak → anggota boleh input (ulang). Backend yang memutuskan
  // final; kalau ditolak, pesan error tampil di StatusModal.
  const canSubmit = !myResult || rejected;

  async function submit() {
    setSubmitting(true);
    const metric_values: Record<string, number> = {};
    metrics.forEach(m => {
      const num = Number(values[m.code]);
      if (Number.isFinite(num) && values[m.code] !== '' && values[m.code] != null) {
        metric_values[m.code] = num;
      }
    });
    try {
      await submitAcademyPracticalResultApi(practicalId, {
        metric_values,
        notes: notes.trim() || undefined,
      });
      setResult({
        ok: true,
        message: 'Hasil penilaian praktik berhasil dikirim & menunggu verifikasi instruktur.',
      });
    } catch (e) {
      setResult({ ok: false, message: extractErrorMessage(e, 'Gagal mengirim hasil praktik.') });
    }
    setSubmitting(false);
  }

  return (
    <AcademyScreen
      title="Input Hasil Praktik"
      subtitle={config?.title ?? title}
      onBack={() => navigation.goBack()}
      loading={loading}
      error={error}
      onRetry={load}
      footer={
        canSubmit && metrics.length > 0 ? (
          <GradientButton
            label={rejected ? 'Input Ulang' : 'Kirim untuk Diverifikasi'}
            loading={submitting}
            disabled={Object.keys(values).filter(k => values[k] !== '').length === 0}
            onPress={submit}
          />
        ) : undefined
      }>
      {rejected && myResult?.rejection_reason ? (
        <View style={styles.rejectCard}>
          <Badge label="Ditolak" variant="danger" style={styles.rejectBadge} />
          <Text style={styles.rejectReason}>{myResult.rejection_reason}</Text>
        </View>
      ) : null}

      {config?.description ? <Text style={styles.desc}>{config.description}</Text> : null}

      {myResult && !canSubmit ? (
        <View style={styles.statusCard}>
          <Icon name="clock" size={18} color={colors.warningText} />
          <Text style={styles.statusText}>
            Hasil sudah dikirim
            {myResult.verification_status === 'verified'
              ? ` & terverifikasi${myResult.score != null ? ` (nilai ${myResult.score})` : ''}.`
              : ' dan sedang menunggu verifikasi instruktur.'}
          </Text>
        </View>
      ) : metrics.length === 0 ? (
        <Text style={styles.statusText}>Rubrik penilaian praktik belum tersedia.</Text>
      ) : (
        <>
          {metrics.map(metric => (
            <View key={metric.code} style={styles.field}>
              <Text style={styles.label}>
                {metric.name}
                {metric.is_required ? <Text style={styles.req}> *</Text> : null}
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  keyboardType={metric.input_type === 'text' ? 'default' : 'numeric'}
                  placeholder={
                    metric.minimum != null && metric.maximum != null
                      ? `${metric.minimum}–${metric.maximum}`
                      : '0'
                  }
                  placeholderTextColor={colors.placeholder}
                  value={values[metric.code] ?? ''}
                  onChangeText={t => setValues(prev => ({ ...prev, [metric.code]: t }))}
                />
                {metric.unit ? <Text style={styles.unit}>{metric.unit}</Text> : null}
              </View>
            </View>
          ))}

          <View style={styles.field}>
            <Text style={styles.label}>
              Catatan <Text style={styles.optional}>(opsional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              placeholder="Tambah catatan pelaksanaan"
              placeholderTextColor={colors.placeholder}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={styles.infoBox}>
            <Icon name="info" size={16} color={colors.primary} />
            <Text style={styles.infoText}>
              Hasil ini akan menunggu verifikasi instruktur sebelum masuk ke nilai akhir program.
            </Text>
          </View>
        </>
      )}

      <StatusModal
        visible={!!result}
        variant={result?.ok ? 'success' : 'error'}
        title={result?.ok ? 'Hasil Berhasil Dikirim' : 'Gagal'}
        message={result?.message ?? ''}
        primaryAction={{
          label: result?.ok ? 'Kembali ke Program' : 'Tutup',
          onPress: () => {
            const ok = result?.ok;
            setResult(null);
            if (ok) navigation.goBack();
          },
        }}
        onRequestClose={() => setResult(null)}
      />
    </AcademyScreen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  req: { color: colors.danger },
  optional: { fontWeight: '400', color: colors.placeholder },
  desc: { fontSize: 13, lineHeight: 20, color: colors.textBody },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.text,
    borderWidth: 0,
  },
  unit: { fontSize: 13, color: colors.placeholder },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    backgroundColor: colors.attachmentRowSurface,
    padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.textBody },
  rejectCard: {
    borderWidth: 1,
    borderColor: colors.dangerMuted,
    borderRadius: 14,
    backgroundColor: colors.dangerSurface,
    padding: 14,
    gap: 8,
  },
  rejectBadge: { alignSelf: 'flex-start' },
  rejectReason: { fontSize: 13, lineHeight: 19, color: colors.dangerText },
  statusCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    backgroundColor: colors.surface,
    padding: 14,
  },
  statusText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textBody },
});
