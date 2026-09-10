import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import EmptyState from '@/components/molecules/EmptyState';
import { ROUTES } from '@/navigation/paths';
import AcademyTabScreen from '@/screens/Academy/shared/AcademyTabScreen';
import ProgramCard from '@/screens/Academy/shared/ProgramCard';
import type { AcademyTabNav } from '@/screens/Academy/shared/types';
import { getAcademyProgramsApi, getAcademySummaryApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyProgramListItem, AcademySummaryMember } from '@/types';
import { extractErrorMessage } from '@/utils/format';

export default function AcademyMemberHome() {
  const navigation = useNavigation<AcademyTabNav>();

  const [summary, setSummary] = useState<AcademySummaryMember | null>(null);
  const [ongoing, setOngoing] = useState<AcademyProgramListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    const [summaryRes, programsRes] = await Promise.allSettled([
      getAcademySummaryApi(),
      // `status` di GET /academy/programs memfilter status PROGRAM, bukan status peserta —
      // "Lanjutkan Belajar" butuh peserta yang in_progress, jadi saring di klien.
      getAcademyProgramsApi({ type: 'my', per_page: 50 }),
    ]);
    if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.member ?? null);
    if (programsRes.status === 'fulfilled') {
      setOngoing(programsRes.value.items.filter(p => p.participant_status === 'in_progress'));
    }
    if (summaryRes.status === 'rejected' && programsRes.status === 'rejected') {
      setError(extractErrorMessage(summaryRes.reason, 'Data gagal dimuat.'));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(first.current ? 'initial' : 'refresh');
      first.current = false;
    }, [load]),
  );

  return (
    <AcademyTabScreen
      loading={loading}
      error={error}
      onRetry={() => load('initial')}
      onRefresh={() => load('refresh')}
      refreshing={refreshing}>
      {summary ? (
        <Card style={styles.summaryCard}>
          <SummaryCell value={summary.active_programs} label="Program Aktif" />
          <View style={styles.summaryDivider} />
          <SummaryCell value={summary.not_started_programs} label="Belum Dimulai" />
          <View style={styles.summaryDivider} />
          <SummaryCell value={summary.completed_programs} label="Selesai" />
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>Lanjutkan Belajar</Text>
      {ongoing.length === 0 ? (
        <EmptyState
          icon="academy"
          title="Belum ada yang berjalan"
          message="Program yang ditugaskan akan muncul di sini."
          style={styles.empty}
        />
      ) : (
        ongoing.slice(0, 3).map(program => (
          <ProgramCard
            key={program.id}
            program={program}
            onPress={() =>
              navigation.navigate(ROUTES.academyProgramDetail, { programId: program.id, pov: 'my' })
            }
            ctaLabel="Lanjutkan"
            onCtaPress={() =>
              navigation.navigate(ROUTES.academyProgramDetail, { programId: program.id, pov: 'my' })
            }
          />
        ))
      )}

      {summary && summary.pending_verifications > 0 ? (
        <PressableScale
          scaleTo={0.98}
          onPress={() => navigation.navigate(ROUTES.academyTabResults)}>
          <Card style={styles.pendingCard}>
            <View style={styles.pendingIcon}>
              <Icon name="clock" size={19} color={colors.warningText} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.pendingTitle}>Menunggu Verifikasi</Text>
              <Text style={styles.pendingSub}>
                {summary.pending_verifications} hasil praktik sedang ditinjau instruktur
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.placeholder} />
          </Card>
        </PressableScale>
      ) : null}

      <Text style={styles.sectionTitle}>Program Saya</Text>
      <GradientButton
        label="Lihat Semua Program"
        height={48}
        onPress={() => navigation.navigate(ROUTES.academyTabPrograms)}
      />
    </AcademyTabScreen>
  );
}

function SummaryCell({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summaryCard: { flexDirection: 'row', alignItems: 'stretch', padding: 0, overflow: 'hidden' },
  summaryCell: { flex: 1, paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: colors.borderSoft },
  summaryValue: { fontSize: 22, fontWeight: '800', color: colors.heading },
  summaryLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.heading, marginTop: 12 },
  empty: { paddingVertical: 24 },
  pendingCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.warningSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: { fontSize: 14, fontWeight: '700', color: colors.heading },
  pendingSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
