import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import Card from '@/components/molecules/Card';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AcademyScreen from '@/screens/Academy/shared/AcademyScreen';
import {
  getAcademyAssessmentApi,
  startAcademyAttemptApi,
} from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyAssessment } from '@/types';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.academyAssessmentIntro>;

export default function AcademyAssessmentIntroScreen(props: Props) {
  const { navigation, route } = props;
  const { assessmentId, programId, title } = route.params;

  const [assessment, setAssessment] = useState<AcademyAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssessment(await getAcademyAssessmentApi(assessmentId));
    } catch (e) {
      setError(extractErrorMessage(e, 'Data gagal dimuat.'));
    }
    setLoading(false);
  }, [assessmentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function start() {
    if (!assessment) return;
    setStarting(true);
    setStartError(null);
    try {
      const attempt = await startAcademyAttemptApi(assessmentId);
      navigation.replace(ROUTES.academyAttempt, {
        attemptId: attempt.attempt_id,
        assessmentId,
        programId,
      });
    } catch (e) {
      setStartError(extractErrorMessage(e, 'Gagal memulai assessment.'));
      setStarting(false);
    }
  }

  const minutes = assessment?.time_limit_seconds
    ? Math.round(assessment.time_limit_seconds / 60)
    : null;

  return (
    <AcademyScreen
      title={assessment?.title ?? title ?? 'Assessment'}
      onBack={() => navigation.goBack()}
      loading={loading}
      error={error}
      onRetry={load}
      footer={
        assessment ? (
          <GradientButton
            label="Mulai Assessment"
            loading={starting}
            disabled={!assessment.can_start}
            onPress={start}
          />
        ) : undefined
      }>
      {assessment ? (
        <>
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              {minutes != null ? (
                <>
                  <Stat value={String(minutes)} label="Menit" />
                  <View style={styles.vline} />
                </>
              ) : null}
              <Stat value={String(assessment.passing_score ?? '-')} label="Passing" />
            </View>
            <View style={styles.attemptRow}>
              <Text style={styles.attemptLabel}>Percobaan</Text>
              <Text style={styles.attemptValue}>
                {assessment.attempts_used} dari {assessment.maximum_attempts ?? '∞'} terpakai
              </Text>
            </View>
          </Card>

          <View style={styles.note}>
            <Icon name="alert-triangle" size={18} color={colors.warningText} />
            <Text style={styles.noteText}>
              Pastikan koneksi internet stabil sebelum memulai. Waktu berjalan di server &mdash;
              jawaban tersimpan otomatis dan ujian dapat dilanjutkan bila terputus.
            </Text>
          </View>

          {startError ? <Text style={styles.startError}>{startError}</Text> : null}
        </>
      ) : null}
    </AcademyScreen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: { padding: 0, overflow: 'hidden', gap: 0 },
  statsRow: { flexDirection: 'row', alignItems: 'stretch' },
  vline: { width: 1, backgroundColor: colors.borderSoft },
  stat: { flex: 1, paddingVertical: 18, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.heading },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  attemptLabel: { fontSize: 13, color: colors.textMuted },
  attemptValue: { fontSize: 13, fontWeight: '700', color: colors.heading },
  note: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.warningSurface,
    backgroundColor: colors.warningSurface,
    padding: 14,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.warningText },
  startError: { fontSize: 13, color: colors.danger, textAlign: 'center' },
});
