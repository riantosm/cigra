import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import EmptyState from '@/components/molecules/EmptyState';
import { ROUTES } from '@/navigation/paths';
import AcademyTabScreen from '@/screens/Academy/shared/AcademyTabScreen';
import ProgramCard from '@/screens/Academy/shared/ProgramCard';
import type { AcademyTabNav } from '@/screens/Academy/shared/types';
import { getAcademyProgramsApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyProgramListItem, AcademyProgramPov } from '@/types';
import { extractErrorMessage, formatDateShort } from '@/utils/format';
import { programStatusBadge } from '@/utils/academy';

export interface AcademyProgramsTabProps {
  pov: AcademyProgramPov;
}

// Filter POV Anggota = status PESERTA (participant_status), disaring di klien — param `status`
// di GET /academy/programs memfilter status PROGRAM (draft/published/ongoing/completed).
const MEMBER_FILTERS: { key: string; label: string; match: (s: string | null) => boolean }[] = [
  { key: '', label: 'Semua', match: () => true },
  { key: 'in_progress', label: 'Berjalan', match: s => s === 'in_progress' },
  { key: 'not_started', label: 'Belum Dimulai', match: s => s === 'not_started' || s == null },
  {
    key: 'completed',
    label: 'Selesai',
    match: s => s === 'completed' || s === 'passed' || s === 'failed',
  },
];

// Layar TAB "Program" Smart Academy — dipakai 3 POV (my / instructor / commander) lewat
// GET /academy/programs?type=…. Kartu membuka detail program per POV (read-only untuk
// instruktur & komandan — tidak ada endpoint daftar peserta di kontrak).
export default function AcademyProgramsTab({ pov }: AcademyProgramsTabProps) {
  const navigation = useNavigation<AcademyTabNav>();

  const [items, setItems] = useState<AcademyProgramListItem[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);

  const load = useCallback(
    async (loadMode: 'initial' | 'refresh') => {
      if (loadMode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const res = await getAcademyProgramsApi({ type: pov, per_page: 50 });
        setItems(res.items);
      } catch (e) {
        setError(extractErrorMessage(e, 'Data gagal dimuat.'));
      }
      setLoading(false);
      setRefreshing(false);
    },
    [pov],
  );

  useFocusEffect(
    useCallback(() => {
      load(first.current ? 'initial' : 'refresh');
      first.current = false;
    }, [load]),
  );

  const visible = useMemo(() => {
    if (pov !== 'my' || !filter) return items;
    const rule = MEMBER_FILTERS.find(f => f.key === filter);
    return rule ? items.filter(p => rule.match(p.participant_status)) : items;
  }, [items, filter, pov]);

  function openProgram(program: AcademyProgramListItem) {
    if (pov === 'commander') {
      navigation.navigate(ROUTES.academyCmdProgramDetail, {
        programId: program.id,
        title: program.title,
      });
    } else if (pov === 'instructor') {
      navigation.navigate(ROUTES.academyInsProgramDetail, {
        programId: program.id,
        title: program.title,
      });
    } else {
      navigation.navigate(ROUTES.academyProgramDetail, { programId: program.id, pov: 'my' });
    }
  }

  return (
    <AcademyTabScreen
      loading={loading}
      error={error}
      onRetry={() => load('initial')}
      onRefresh={() => load('refresh')}
      refreshing={refreshing}>
      {pov === 'my' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {MEMBER_FILTERS.map(f => {
            const active = f.key === filter;
            return (
              <PressableScale key={f.key || 'all'} onPress={() => setFilter(f.key)}>
                <View style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                </View>
              </PressableScale>
            );
          })}
        </ScrollView>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon="academy"
          title="Belum ada program"
          message={
            pov === 'instructor'
              ? 'Belum ada program yang ditugaskan kepada Anda.'
              : pov === 'commander'
                ? 'Belum ada program di satuan.'
                : 'Belum ada program yang ditugaskan.'
          }
          style={styles.empty}
        />
      ) : pov === 'my' ? (
        visible.map(program => (
          <ProgramCard
            key={program.id}
            program={program}
            onPress={() => openProgram(program)}
            ctaLabel={
              program.participant_status === 'not_started'
                ? 'Mulai Program'
                : program.participant_status === 'completed' ||
                    program.participant_status === 'passed' ||
                    program.participant_status === 'failed'
                  ? undefined
                  : 'Lanjutkan'
            }
            onCtaPress={() => openProgram(program)}
          />
        ))
      ) : (
        visible.map(program => {
          const badge = programStatusBadge(program.status);
          const deadline = program.completion_deadline ?? program.end_date;
          return (
            <PressableScale key={program.id} scaleTo={0.98} onPress={() => openProgram(program)}>
              <Card style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {program.title}
                  </Text>
                  <Badge label={badge.label} variant={badge.variant} style={styles.badge} />
                </View>
                <Text style={styles.cardMeta}>{program.code}</Text>
                {deadline ? (
                  <View style={styles.metaRow}>
                    <Icon name="calendar" size={14} color={colors.textMuted} />
                    <Text style={styles.metaText}>Deadline {formatDateShort(deadline)}</Text>
                  </View>
                ) : null}
              </Card>
            </PressableScale>
          );
        })
      )}
    </AcademyTabScreen>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primaryForeground },
  empty: { paddingVertical: 32 },
  card: { gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.heading, lineHeight: 20 },
  badge: { alignSelf: 'flex-start' },
  cardMeta: { fontSize: 12, color: colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.textMuted },
});
