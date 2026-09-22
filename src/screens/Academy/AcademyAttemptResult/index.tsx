import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import GradientButton from '@/components/atoms/GradientButton';
import GradientIconChip from '@/components/atoms/GradientIconChip';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AcademyScreen from '@/screens/Academy/shared/AcademyScreen';
import { getAcademyAttemptResultApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyAttemptResult } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { formatScore } from '@/utils/academy';

type Props = RootStackScreenProps<typeof ROUTES.academyAttemptResult>;

export default function AcademyAttemptResultScreen(props: Props) {
  const { navigation, route } = props;
  const { attemptId } = route.params;

  const [result, setResult] = useState<AcademyAttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await getAcademyAttemptResultApi(attemptId));
    } catch (e) {
      setError(extractErrorMessage(e, 'Data gagal dimuat.'));
    }
    setLoading(false);
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  const passed = (result?.passing_status ?? '').toLowerCase() === 'passed';

  return (
    <AcademyScreen
      title="Assessment Selesai"
      onBack={() => navigation.goBack()}
      loading={loading}
      error={error}
      onRetry={load}
      contentStyle={styles.content}
      footer={
        <GradientButton
          label="Kembali ke Program"
          onPress={() => navigation.navigate(ROUTES.academyRoot)}
        />
      }>
      {result ? (
        <>
          <View style={styles.badgeWrap}>
            <GradientIconChip
              icon={passed ? 'check' : 'close'}
              colors={passed ? [colors.gradientSuccessStart, colors.success] : [colors.gradientDangerStart, colors.danger]}
              size={76}
              iconSize={32}
              radius={38}
            />
          </View>

          <Text style={styles.title}>{passed ? 'LULUS' : 'TIDAK LULUS'}</Text>
          <View style={styles.card}>
            <Text style={styles.scoreKicker}>NILAI</Text>
            <Text style={styles.score}>{formatScore(result.score)}</Text>
            <Text style={styles.passingHint}>Passing grade {result.passing_score}</Text>
            <View style={styles.splitRow}>
              <View style={styles.splitCell}>
                <Text style={[styles.splitNum, { color: colors.success }]}>
                  {result.correct_count}
                </Text>
                <Text style={styles.splitLabel}>Benar</Text>
              </View>
              <View style={styles.splitDivider} />
              <View style={styles.splitCell}>
                <Text style={[styles.splitNum, { color: colors.danger }]}>
                  {result.incorrect_count}
                </Text>
                <Text style={styles.splitLabel}>Salah</Text>
              </View>
            </View>
            <Text style={styles.totalHint}>dari {result.total_questions} soal</Text>
          </View>
        </>
      ) : null}
    </AcademyScreen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingTop: 24 },
  badgeWrap: { marginTop: 12 },
  title: { fontSize: 20, fontWeight: '800', color: colors.heading, marginTop: 12, letterSpacing: -0.3 },
  card: {
    alignSelf: 'stretch',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 22,
    alignItems: 'center',
    marginTop: 16,
    gap: 4,
  },
  scoreKicker: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: colors.placeholder },
  score: { fontSize: 52, fontWeight: '800', color: colors.heading, lineHeight: 56 },
  passingHint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  splitRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  splitCell: { flex: 1, alignItems: 'center' },
  splitDivider: { width: 1, backgroundColor: colors.borderSoft },
  splitNum: { fontSize: 20, fontWeight: '800' },
  splitLabel: { fontSize: 12, color: colors.textMuted },
  totalHint: { fontSize: 12, color: colors.placeholder, marginTop: 10 },
});
