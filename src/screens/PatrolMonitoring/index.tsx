import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import CodeChip from '@/components/atoms/CodeChip';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getPatrolMonitoringApi } from '@/services/api/patrol.service';
import { colors } from '@/theme/colors';
import type {
  PatrolMonitoringSession,
  PatrolMonitoringStatusFilter,
  PatrolMonitoringSummary,
} from '@/types';
import { extractErrorMessage, joinFields } from '@/utils/format';
import { patrolClockLabel, patrolDateLabel, patrolMinutesLabel } from '@/utils/patrol';

type Props = RootStackScreenProps<typeof ROUTES.patrolMonitoring>;

const FILTERS: { value: PatrolMonitoringStatusFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'in_progress', label: 'Berjalan' },
  { value: 'completed', label: 'Selesai' },
];

const EMPTY_SUMMARY: PatrolMonitoringSummary = {
  total_sessions: 0,
  in_progress_count: 0,
  completed_count: 0,
};

function officerLabel(officer: PatrolMonitoringSession['officer']): string {
  return joinFields(officer.rank ?? undefined, officer.full_name) || officer.full_name || 'Petugas';
}

export default function PatrolMonitoringScreen(props: Props) {
  const { navigation } = props;

  const [summary, setSummary] = useState<PatrolMonitoringSummary>(EMPTY_SUMMARY);
  const [sessions, setSessions] = useState<PatrolMonitoringSession[]>([]);
  const [filter, setFilter] = useState<PatrolMonitoringStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaging, setIsPaging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'filter', nextFilter?: PatrolMonitoringStatusFilter) => {
      const activeFilter = nextFilter ?? filter;
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      if (mode === 'filter') setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await getPatrolMonitoringApi({
          page: 1,
          status: activeFilter === 'all' ? undefined : activeFilter,
        });
        // KPI selalu dari data tak terfilter ("Semua") supaya angkanya stabil saat ganti filter —
        // response `summary` ikut menyempit kalau `status` dikirim.
        if (activeFilter === 'all') setSummary(result.summary);
        setSessions(result.sessions);
        setPage(result.meta?.current_page ?? 1);
        setLastPage(result.meta?.last_page ?? 1);
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat data monitoring patroli.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [filter],
  );

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        load('initial');
        isFirstFocus.current = false;
      } else {
        load('refresh');
      }
    }, [load]),
  );

  async function loadMore() {
    if (isPaging || isLoading || isRefreshing || page >= lastPage) return;
    setIsPaging(true);
    try {
      const result = await getPatrolMonitoringApi({
        page: page + 1,
        status: filter === 'all' ? undefined : filter,
      });
      setSessions(prev => {
        const seen = new Set(prev.map(s => s.id));
        return [...prev, ...result.sessions.filter(s => !seen.has(s.id))];
      });
      setPage(result.meta?.current_page ?? page + 1);
      setLastPage(result.meta?.last_page ?? lastPage);
    } catch {
      // diamkan — user bisa tarik-untuk-refresh
    } finally {
      setIsPaging(false);
    }
  }

  function handleFilterChange(next: PatrolMonitoringStatusFilter) {
    if (next === filter) return;
    setFilter(next);
    setSessions([]);
    load('filter', next);
  }

  const kpis = useMemo(
    () => [
      { label: 'Total Sesi', value: summary.total_sessions, color: colors.primary, icon: 'route' as const },
      {
        label: 'Berjalan',
        value: summary.in_progress_count,
        color: colors.success,
        icon: 'clock' as const,
      },
      {
        label: 'Selesai',
        value: summary.completed_count,
        color: colors.textMuted,
        icon: 'check' as const,
      },
    ],
    [summary],
  );

  return (
    <MainLayout
      title="Monitoring Patroli"
      subtitle="Pantau aktivitas patroli prajurit"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={styles.flex}>
        <View style={styles.kpiRow}>
          {kpis.map(kpi => (
            <Card key={kpi.label} style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: `${kpi.color}1A` }]}>
                <Icon name={kpi.icon} size={15} color={kpi.color} />
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </Card>
          ))}
        </View>

        <SegmentedControl
          options={FILTERS}
          value={filter}
          onChange={handleFilterChange}
          style={styles.filter}
        />

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => load('refresh')}
                tintColor={colors.primary}
              />
            }
            onEndReachedThreshold={0.4}
            onEndReached={loadMore}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {errorMessage ?? 'Belum ada sesi patroli untuk dipantau.'}
              </Text>
            }
            ListFooterComponent={
              isPaging ? (
                <ActivityIndicator style={styles.pagingLoader} color={colors.primary} />
              ) : undefined
            }
            renderItem={({ item }) => (
              <PressableScale
                scaleTo={0.98}
                onPress={() =>
                  navigation.navigate(ROUTES.patrolMonitoringDetail, { session: item })
                }>
                <Card style={styles.sessionCard}>
                  <View style={styles.sessionTop}>
                    <View style={styles.sessionOfficer}>
                      <Text style={styles.officerName} numberOfLines={1}>
                        {officerLabel(item.officer)}
                      </Text>
                      <Text style={styles.officerNrp}>NRP {item.officer.service_number}</Text>
                    </View>
                    <Badge
                      label={item.status === 'in_progress' ? 'Berjalan' : 'Selesai'}
                      variant={item.status === 'in_progress' ? 'success' : 'neutral'}
                    />
                  </View>

                  <View style={styles.routeRow}>
                    <Icon name="route" size={13} color={colors.textMuted} />
                    <Text style={styles.routeName} numberOfLines={1}>
                      {item.route.name}
                    </Text>
                    <CodeChip code={item.route.code} />
                  </View>

                  <View style={styles.progressHead}>
                    <Text style={styles.progressText}>
                      {item.completed_checkpoints}/{item.total_checkpoints} checkpoint
                    </Text>
                    <Text style={styles.progressPercent}>
                      {Math.round(item.progress_percentage)}%
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.max(0, Math.min(100, item.progress_percentage))}%`,
                          backgroundColor:
                            item.status === 'in_progress' ? colors.success : colors.primary,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Icon name="clock" size={12} color={colors.textMuted} />
                      <Text style={styles.metaText}>
                        {item.status === 'in_progress'
                          ? `Berjalan ${patrolMinutesLabel(item.duration_minutes)}`
                          : `Durasi ${patrolMinutesLabel(item.duration_minutes)}`}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Icon name="calendar" size={12} color={colors.textMuted} />
                      <Text style={styles.metaText}>
                        {patrolClockLabel(item.started_at)} · {patrolDateLabel(item.started_at)}
                      </Text>
                    </View>
                  </View>

                  {item.has_location_anomaly ? (
                    <View style={styles.anomalyBanner}>
                      <Icon name="alert-triangle" size={13} color={colors.warningText} />
                      <Text style={styles.anomalyText}>Ada check-in di luar radius checkpoint</Text>
                    </View>
                  ) : null}
                </Card>
              </PressableScale>
            )}
          />
        )}
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  pagingLoader: { marginVertical: 16 },
  kpiRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingTop: 4 },
  kpiCard: { flex: 1, alignItems: 'flex-start', gap: 4, padding: 12 },
  kpiIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: { fontSize: 22, fontWeight: '800', color: colors.heading, letterSpacing: -0.5 },
  kpiLabel: { fontSize: 11, color: colors.textMuted },
  filter: { marginHorizontal: 24, marginTop: 16 },
  listContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 12 },
  empty: { textAlign: 'center', fontSize: 14, color: colors.textMuted, paddingVertical: 32 },
  sessionCard: { gap: 10 },
  sessionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sessionOfficer: { flex: 1, gap: 2 },
  officerName: { fontSize: 15, fontWeight: '700', color: colors.heading },
  officerNrp: { fontSize: 11, color: colors.textMuted },
  routeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  routeName: { fontSize: 13, fontWeight: '600', color: colors.textBody },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { fontSize: 12, color: colors.textMuted },
  progressPercent: { fontSize: 12, fontWeight: '700', color: colors.heading },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11, color: colors.textMuted },
  anomalyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningSurface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  anomalyText: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.warningText },
});
