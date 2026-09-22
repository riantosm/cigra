import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import Card from '@/components/molecules/Card';
import EmptyState from '@/components/molecules/EmptyState';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AcademyScreen from '@/screens/Academy/shared/AcademyScreen';
import { getAcademyCommanderOverviewApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyCommanderTopCompetency } from '@/types';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.academyCmdCompetency>;

export default function AcademyCmdCompetencyScreen(props: Props) {
  const { navigation } = props;
  const [items, setItems] = useState<AcademyCommanderTopCompetency[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await getAcademyCommanderOverviewApi();
      setItems(overview?.top_competencies ?? []);
      setTotalParticipants(overview?.total_participants ?? 0);
    } catch (e) {
      setError(extractErrorMessage(e, 'Data gagal dimuat.'));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const max = items.reduce((m, c) => Math.max(m, c.total_achieved), 0);

  return (
    <AcademyScreen
      title="Kompetensi"
      subtitle="Kualifikasi teratas di satuan"
      onBack={() => navigation.goBack()}
      loading={loading}
      error={error}
      onRetry={load}>
      {items.length === 0 ? (
        <EmptyState
          icon="medal"
          title="Belum ada data"
          message="Belum ada kualifikasi yang tercatat di satuan."
          style={styles.empty}
        />
      ) : (
        items.map(item => {
          const pct = max > 0 ? (item.total_achieved / max) * 100 : 0;
          return (
            <Card key={item.competency_name} style={styles.row}>
              <GradientIconChip
                icon="medal"
                colors={[colors.gradientWarnStart, colors.warning]}
                size={44}
                iconSize={20}
                radius={12}
              />
              <View style={styles.flex}>
                <Text style={styles.name}>{item.competency_name}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.meta}>
                  {item.total_achieved} anggota
                  {totalParticipants > 0
                    ? ` · ${Math.round((item.total_achieved / totalParticipants) * 100)}% satuan`
                    : ''}
                </Text>
              </View>
            </Card>
          );
        })
      )}
    </AcademyScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: { paddingVertical: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 15, fontWeight: '700', color: colors.heading },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
    overflow: 'hidden',
    marginTop: 6,
  },
  fill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 5 },
});
