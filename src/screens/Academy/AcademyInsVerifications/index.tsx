import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import EmptyState from '@/components/molecules/EmptyState';
import { ROUTES } from '@/navigation/paths';
import AcademyTabScreen from '@/screens/Academy/shared/AcademyTabScreen';
import type { AcademyTabNav } from '@/screens/Academy/shared/types';
import { getAcademyVerificationsApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyVerificationItem } from '@/types';
import { extractErrorMessage, formatDateTime } from '@/utils/format';

export default function AcademyInsVerifications() {
  const navigation = useNavigation<AcademyTabNav>();

  const [items, setItems] = useState<AcademyVerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await getAcademyVerificationsApi({ per_page: 40 });
      setItems(res.items);
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

  return (
    <AcademyTabScreen
      loading={loading}
      error={error}
      onRetry={() => load('initial')}
      onRefresh={() => load('refresh')}
      refreshing={refreshing}>
      {items.length === 0 ? (
        <EmptyState
          icon="clipboard-check"
          title="Tidak ada antrean"
          message="Semua hasil praktik sudah diverifikasi."
          style={styles.empty}
        />
      ) : (
        items.map(item => {
          const metrics = Object.entries(item.metric_values ?? {});
          return (
            <Card key={item.id} style={styles.card}>
              <View style={styles.top}>
                <View style={styles.flex}>
                  <Text style={styles.name}>{item.personnel?.name ?? 'Peserta'}</Text>
                  <Text style={styles.meta}>
                    {item.assessment_title}
                    {item.program_title ? ` · ${item.program_title}` : ''}
                  </Text>
                </View>
                <Badge label="Menunggu" variant="primary" style={styles.badge} />
              </View>
              {metrics.length > 0 ? (
                <View style={styles.metricsRow}>
                  {metrics.slice(0, 3).map(([key, value]) => (
                    <View key={key}>
                      <Text style={styles.metricLabel}>{key}</Text>
                      <Text style={styles.metricValue}>{String(value)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.bottom}>
                <Text style={styles.submitted}>
                  Dikirim {item.submitted_at ? formatDateTime(item.submitted_at) : '-'}
                </Text>
                <PressableScale
                  onPress={() =>
                    navigation.navigate(ROUTES.academyInsVerificationDetail, { item })
                  }>
                  <View style={styles.reviewBtn}>
                    <Text style={styles.reviewText}>Review</Text>
                  </View>
                </PressableScale>
              </View>
            </Card>
          );
        })
      )}
    </AcademyTabScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: { paddingVertical: 32 },
  card: { gap: 12 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  name: { fontSize: 15, fontWeight: '700', color: colors.heading },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  badge: { alignSelf: 'flex-start' },
  metricsRow: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  metricLabel: { fontSize: 11, color: colors.placeholder },
  metricValue: { fontSize: 15, fontWeight: '700', color: colors.heading },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  submitted: { fontSize: 11, color: colors.placeholder, flex: 1 },
  reviewBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
  },
  reviewText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
