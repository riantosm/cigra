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
import { getAcademyCompetenciesApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyCompetency } from '@/types';
import { extractErrorMessage, formatDateShort } from '@/utils/format';
import { competencyStatusBadge, formatScore } from '@/utils/academy';

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'active', label: 'Aktif' },
  { key: 'expiring', label: 'Akan Kedaluwarsa' },
  { key: 'expired', label: 'Kedaluwarsa' },
];

export default function AcademyCompetencies() {
  const navigation = useNavigation<AcademyTabNav>();
  const [items, setItems] = useState<AcademyCompetency[]>([]);
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
      setItems(await getAcademyCompetenciesApi());
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

  const decorated = useMemo(
    () => items.map(c => ({ c, badge: competencyStatusBadge(c.status, c.expires_at) })),
    [items],
  );
  const filtered = useMemo(() => {
    if (filter === 'all') return decorated;
    const map: Record<string, string> = {
      active: 'Aktif',
      expiring: 'Akan Kedaluwarsa',
      expired: 'Kedaluwarsa',
    };
    return decorated.filter(d => d.badge.label === map[filter]);
  }, [decorated, filter]);

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
          title="Belum ada kompetensi"
          message="Kualifikasi yang Anda peroleh akan muncul di sini."
          style={styles.empty}
        />
      ) : (
        filtered.map(({ c, badge }) => (
          <PressableScale
            key={c.id}
            scaleTo={0.98}
            onPress={() =>
              navigation.navigate(ROUTES.academyCompetencyDetail, {
                competencyId: c.id,
                name: c.competency_name,
              })
            }>
            <Card style={styles.card}>
              <View style={styles.scoreCell}>
                <Text style={[styles.scoreNum, badge.label === 'Kedaluwarsa' && styles.scoreMuted]}>
                  {formatScore(c.score)}
                </Text>
              </View>
              <View style={styles.vline} />
              <View style={styles.flex}>
                <Text style={styles.title}>{c.competency_name}</Text>
                <Text style={styles.meta}>
                  {c.category}
                  {c.expires_at
                    ? ` · ${badge.label === 'Kedaluwarsa' ? 'kedaluwarsa' : 'berlaku sampai'} ${formatDateShort(c.expires_at)}`
                    : ''}
                </Text>
              </View>
              <Badge label={badge.label} variant={badge.variant} style={styles.badge} />
            </Card>
          </PressableScale>
        ))
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
  scoreCell: { width: 48, alignItems: 'center' },
  scoreNum: { fontSize: 20, fontWeight: '800', color: colors.heading },
  scoreMuted: { color: colors.placeholder },
  vline: { width: 1, alignSelf: 'stretch', backgroundColor: colors.borderSoft },
  title: { fontSize: 15, fontWeight: '700', color: colors.heading },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  badge: { alignSelf: 'center' },
});
