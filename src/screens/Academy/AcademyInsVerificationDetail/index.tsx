import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import BottomSheet from '@/components/organisms/BottomSheet';
import StatusModal from '@/components/organisms/StatusModal';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AcademyScreen from '@/screens/Academy/shared/AcademyScreen';
import { verifyAcademyResultApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import { extractErrorMessage, formatDateTime, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.academyInsVerificationDetail>;
type Sheet = 'verify' | 'reject' | null;

export default function AcademyInsVerificationDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { item } = route.params;

  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [scoreInput, setScoreInput] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const keyboardHeight = useKeyboardHeight();

  const metrics = Object.entries(item.metric_values ?? {});
  const score = Number(scoreInput);
  const scoreValid = Number.isFinite(score) && scoreInput !== '' && score >= 0 && score <= 100;

  async function run(action: 'verify' | 'reject') {
    if (action === 'verify' && !scoreValid) return;
    if (action === 'reject' && reason.trim().length === 0) return;
    setBusy(true);
    try {
      await verifyAcademyResultApi(item.id, {
        action,
        score: action === 'verify' ? score : undefined,
        rejection_reason: action === 'reject' ? reason.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      setResult({
        ok: true,
        message:
          action === 'verify'
            ? 'Hasil praktik berhasil diverifikasi dan nilai telah diperbarui.'
            : 'Hasil praktik ditolak. Peserta dapat memperbaiki input.',
      });
      setSheet(null);
    } catch (e) {
      setResult({ ok: false, message: extractErrorMessage(e, 'Aksi gagal dijalankan.') });
      setSheet(null);
    }
    setBusy(false);
  }

  return (
    <AcademyScreen
      title={item.personnel?.name ?? 'Verifikasi'}
      subtitle={joinFields(
        item.personnel?.nrp ? `NRP ${item.personnel.nrp}` : null,
        item.assessment_title,
      )}
      onBack={() => navigation.goBack()}
      footer={
        <View style={styles.footerRow}>
          <PressableScale style={styles.flex} onPress={() => setSheet('reject')}>
            <View style={[styles.ghostBtn, styles.rejectBtn]}>
              <Text style={styles.rejectText}>Tolak</Text>
            </View>
          </PressableScale>
          <GradientButton
            label="Verifikasi"
            icon="check"
            style={styles.flex}
            onPress={() => setSheet('verify')}
          />
        </View>
      }>
      <Text style={styles.sectionLabel}>NILAI DIKIRIM PESERTA</Text>
      <View style={styles.card}>
        {metrics.map(([key, value], index) => (
          <View key={key} style={[styles.row, index < metrics.length - 1 && styles.rowBorder]}>
            <Text style={styles.rowLabel}>{key}</Text>
            <Text style={styles.rowValue}>{String(value)}</Text>
          </View>
        ))}
        <View style={[styles.row, metrics.length > 0 && styles.rowBorder]}>
          <Text style={styles.rowLabel}>Dikirim</Text>
          <Text style={styles.rowValue}>
            {item.submitted_at ? formatDateTime(item.submitted_at) : '-'}
          </Text>
        </View>
      </View>

      {item.notes ? (
        <View style={styles.noteCard}>
          <Icon name="mail" size={16} color={colors.textMuted} />
          <Text style={styles.noteText}>&ldquo;{item.notes}&rdquo;</Text>
        </View>
      ) : null}

      {/* Verify */}
      <BottomSheet visible={sheet === 'verify'} onRequestClose={() => setSheet(null)}>
        <View style={[styles.sheet, { paddingBottom: keyboardHeight || 24 }]}>
          <Text style={styles.sheetTitle}>Verifikasi & Tetapkan Nilai</Text>
          <Text style={styles.sheetSub}>
            Nilai resmi (0–100) akan dikunci dan masuk ke perhitungan akhir program.
          </Text>
          <TextInput
            style={styles.scoreInput}
            keyboardType="numeric"
            placeholder="Nilai 0–100"
            placeholderTextColor={colors.placeholder}
            value={scoreInput}
            onChangeText={setScoreInput}
          />
          <TextInput
            style={styles.reasonInput}
            multiline
            placeholder="Catatan / masukan (opsional)"
            placeholderTextColor={colors.placeholder}
            value={notes}
            onChangeText={setNotes}
          />
          <View style={styles.sheetActions}>
            <PressableScale style={styles.flex} disabled={busy} onPress={() => setSheet(null)}>
              <View style={styles.ghostBtn}>
                <Text style={styles.ghostText}>Batal</Text>
              </View>
            </PressableScale>
            <GradientButton
              label="Simpan & Verifikasi"
              height={50}
              style={styles.flex}
              loading={busy}
              disabled={!scoreValid}
              onPress={() => run('verify')}
            />
          </View>
        </View>
      </BottomSheet>

      {/* Reject */}
      <BottomSheet visible={sheet === 'reject'} onRequestClose={() => setSheet(null)}>
        <View style={[styles.sheet, { paddingBottom: keyboardHeight || 24 }]}>
          <Text style={styles.sheetTitle}>Alasan Penolakan</Text>
          <Text style={styles.sheetSub}>Wajib diisi — alasan akan dikirim ke peserta.</Text>
          <TextInput
            style={styles.reasonInput}
            multiline
            placeholder="Tulis alasan penolakan"
            placeholderTextColor={colors.placeholder}
            value={reason}
            onChangeText={setReason}
          />
          <View style={styles.sheetActions}>
            <PressableScale style={styles.flex} disabled={busy} onPress={() => setSheet(null)}>
              <View style={styles.ghostBtn}>
                <Text style={styles.ghostText}>Batal</Text>
              </View>
            </PressableScale>
            <GradientButton
              label="Tolak Hasil"
              tone="danger"
              height={50}
              style={styles.flex}
              loading={busy}
              disabled={reason.trim().length === 0}
              onPress={() => run('reject')}
            />
          </View>
        </View>
      </BottomSheet>

      <StatusModal
        visible={!!result}
        variant={result?.ok ? 'success' : 'error'}
        title={result?.ok ? 'Selesai' : 'Gagal'}
        message={result?.message ?? ''}
        primaryAction={{
          label: 'Tutup',
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
  flex: { flex: 1 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.primary,
    marginTop: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  rowLabel: { fontSize: 14, color: colors.textMuted },
  rowValue: { fontSize: 15, fontWeight: '700', color: colors.heading },
  noteCard: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    backgroundColor: colors.surface,
    padding: 14,
    marginTop: 12,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textBody },
  footerRow: { flexDirection: 'row', gap: 10 },
  ghostBtn: {
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { fontSize: 14, fontWeight: '600', color: colors.heading },
  rejectBtn: { borderColor: colors.dangerMuted, backgroundColor: colors.dangerSurface },
  rejectText: { fontSize: 14, fontWeight: '700', color: colors.danger },
  sheet: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 14 },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.heading, letterSpacing: -0.3 },
  sheetSub: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  scoreInput: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.surface,
  },
  reasonInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
  },
});
