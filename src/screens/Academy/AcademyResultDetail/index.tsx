import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AcademyScreen from '@/screens/Academy/shared/AcademyScreen';
import { getAcademyProgramApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyProgramDetail } from '@/types';
import { extractErrorMessage, formatDateShort } from '@/utils/format';
import { formatScore, resultStatusBadge } from '@/utils/academy';

type Props = RootStackScreenProps<typeof ROUTES.academyResultDetail>;

export default function AcademyResultDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { programId, title } = route.params;

  const [detail, setDetail] = useState<AcademyProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await getAcademyProgramApi(programId));
    } catch (e) {
      setError(extractErrorMessage(e, 'Data gagal dimuat.'));
    }
    setLoading(false);
  }, [programId]);

  useEffect(() => {
    load();
  }, [load]);

  const p = detail?.participant;
  const badge = resultStatusBadge(p?.final_status);
  const theoryComponent = detail?.components?.find(c => c.type === 'assessment');
  const practicalComponent = detail?.components?.find(c => c.type === 'practical');

  return (
    <AcademyScreen
      title={detail?.title ?? title ?? 'Hasil'}
      subtitle={detail?.completion_deadline ? undefined : undefined}
      onBack={() => navigation.goBack()}
      loading={loading}
      error={error}
      onRetry={load}>
      {p ? (
        <>
          <View style={styles.hero}>
            <Badge label={badge.label} variant={badge.variant} />
            <Text style={styles.scoreKicker}>FINAL SCORE</Text>
            <Text style={styles.score}>{formatScore(p.final_score)}</Text>
            <Text style={styles.hint}>Nilai kelulusan {detail?.pass_grade ?? '-'}</Text>
          </View>

          <View style={styles.card}>
            <Row label={theoryComponent?.title ?? 'Ujian Teori'} value={formatScore(p.theory_score)} />
            <Row
              label={practicalComponent?.title ?? 'Praktik'}
              value={formatScore(p.practical_score)}
            />
            <Row
              label="Tanggal selesai"
              value={
                detail?.completion_deadline ? formatDateShort(detail.completion_deadline) : '-'
              }
              last
            />
          </View>
        </>
      ) : (
        <Text style={styles.empty}>Hasil program ini belum tersedia.</Text>
      )}
    </AcademyScreen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 22,
    alignItems: 'center',
    gap: 4,
  },
  scoreKicker: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: colors.placeholder, marginTop: 12 },
  score: { fontSize: 46, fontWeight: '800', color: colors.heading, lineHeight: 50 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 14, color: colors.textMuted },
  rowValue: { fontSize: 15, fontWeight: '700', color: colors.heading },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
});
