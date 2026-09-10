import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import EmptyState from '@/components/molecules/EmptyState';
import { ROUTES } from '@/navigation/paths';
import AcademyTabScreen from '@/screens/Academy/shared/AcademyTabScreen';
import type { AcademyTabNav } from '@/screens/Academy/shared/types';
import { getAcademyResultsApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyResultItem } from '@/types';
import { extractErrorMessage, formatDateShort } from '@/utils/format';
import { formatScore, resultStatusBadge } from '@/utils/academy';

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'passed', label: 'Lulus' },
  { key: 'failed', label: 'Tidak Lulus' },
];

export default function AcademyResults() {
  const navigation = useNavigation<AcademyTabNav>();
  const [items, setItems] = useState<AcademyResultItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      setItems(await getAcademyResultsApi());
    } catch (e) {
      setError(extractErrorMessage(e, 'Data gagal dimuat.'));
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

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(i => {
      const s = (i.final_status ?? '').toLowerCase();
      return filter === 'passed'
        ? s === 'passed' || s === 'lulus'
        : s === 'failed' || s === 'tidak lulus';
    });
  }, [items, filter]);

  return (
    <AcademyTabScreen
      loading={loading}
      error={error}
      onRetry={() => load('initial')}
      onRefresh={() => load('refresh')}
      refreshing={refreshing}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map(f => {
          const active = f.key === filter;
          return (
            <PressableScale key={f.key} onPress={() => setFilter(f.key)}>
              <View style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState
          icon="medal"
          title="Belum ada hasil"
          message="Hasil program yang sudah dinilai akan muncul di sini."
          style={styles.empty}
        />
      ) : (
        filtered.map(item => {
          const badge = resultStatusBadge(item.final_status);
          return (
            <PressableScale
              key={item.id}
              scaleTo={0.98}
              onPress={() =>
                navigation.navigate(ROUTES.academyResultDetail, {
                  programId: item.program_id,
                  title: item.program_title,
                })
              }>
              <Card style={styles.card}>
                <View style={styles.scoreCell}>
                  <Text style={styles.scoreNum}>{formatScore(item.final_score)}</Text>
                  <Text style={styles.scoreLabel}>nilai</Text>
                </View>
                <View style={styles.vline} />
                <View style={styles.flex}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.program_title}
                  </Text>
                  <Text style={styles.date}>
                    {item.completed_at ? formatDateShort(item.completed_at) : '-'}
                  </Text>
                </View>
                <Badge label={badge.label} variant={badge.variant} style={styles.badge} />
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreCell: { width: 52, alignItems: 'center' },
  scoreNum: { fontSize: 22, fontWeight: '800', color: colors.heading },
  scoreLabel: { fontSize: 10, color: colors.placeholder },
  vline: { width: 1, alignSelf: 'stretch', backgroundColor: colors.borderSoft },
  title: { fontSize: 14, fontWeight: '700', color: colors.heading, lineHeight: 19 },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  badge: { alignSelf: 'center' },
});
