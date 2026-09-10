import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import EmptyState from '@/components/molecules/EmptyState';
import { ROUTES } from '@/navigation/paths';
import AcademyTabScreen from '@/screens/Academy/shared/AcademyTabScreen';
import type { AcademyTabNav } from '@/screens/Academy/shared/types';
import { getAcademyProgramsApi, getAcademySummaryApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyProgramListItem } from '@/types';
import { extractErrorMessage, formatDateShort } from '@/utils/format';
import { programStatusBadge } from '@/utils/academy';

export default function AcademyInstructorHome() {
  const navigation = useNavigation<AcademyTabNav>();

  const [pendingVerif, setPendingVerif] = useState<number | null>(null);
  const [programs, setPrograms] = useState<AcademyProgramListItem[]>([]);
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
      getAcademyProgramsApi({ type: 'instructor', per_page: 20 }),
    ]);
    if (summaryRes.status === 'fulfilled') {
      setPendingVerif(summaryRes.value.instructor_pending_verifications ?? null);
    }
    if (programsRes.status === 'fulfilled') setPrograms(programsRes.value.items);
    if (summaryRes.status === 'rejected' && programsRes.status === 'rejected') {
      setError(extractErrorMessage(programsRes.reason, 'Data gagal dimuat.'));
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
      <Text style={styles.sectionTitle}>Program Saya</Text>
      <PressableScale scaleTo={0.98} onPress={() => navigation.navigate(ROUTES.academyTabPrograms)}>
        <Card style={styles.progRow}>
          <View style={styles.progIcon}>
            <Icon name="academy" size={20} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.progTitle}>{programs.length} Program Ditangani</Text>
            <Text style={styles.progSub}>Ketuk untuk melihat semua program yang Anda tangani</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.placeholder} />
        </Card>
      </PressableScale>

      <Text style={styles.sectionTitle}>Perlu Dikerjakan</Text>
      <PressableScale
        scaleTo={0.98}
        onPress={() => navigation.navigate(ROUTES.academyTabVerifications)}>
        <Card style={styles.verifRow}>
          <View style={styles.verifIcon}>
            <Icon name="clipboard-check" size={19} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.progTitle}>{pendingVerif ?? 0} Menunggu Verifikasi</Text>
            <Text style={styles.progSub}>Hasil praktik mandiri anggota yang perlu ditinjau</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.placeholder} />
        </Card>
      </PressableScale>

      <Text style={styles.sectionTitle}>Program Terbaru</Text>
      {programs.length === 0 ? (
        <EmptyState
          icon="academy"
          title="Belum ada program"
          message="Belum ada program yang ditugaskan kepada Anda."
          style={styles.empty}
        />
      ) : (
        programs.slice(0, 3).map(program => {
          const badge = programStatusBadge(program.status);
          return (
            <PressableScale
              key={program.id}
              scaleTo={0.98}
              onPress={() =>
                navigation.navigate(ROUTES.academyInsProgramDetail, {
                  programId: program.id,
                  title: program.title,
                })
              }>
              <Card style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {program.title}
                  </Text>
                  <Badge label={badge.label} variant={badge.variant} style={styles.badge} />
                </View>
                <Text style={styles.cardMeta}>
                  {program.code}
                  {program.completion_deadline
                    ? ` · deadline ${formatDateShort(program.completion_deadline)}`
                    : ''}
                </Text>
              </Card>
            </PressableScale>
          );
        })
      )}
    </AcademyTabScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.heading, marginTop: 12 },
  empty: { paddingVertical: 24 },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.chipSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  progSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  verifRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verifIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.heading, lineHeight: 20 },
  badge: { alignSelf: 'flex-start' },
  cardMeta: { fontSize: 12, color: colors.textMuted },
});
