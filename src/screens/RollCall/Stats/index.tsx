import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import PressableScale from '@/components/atoms/PressableScale';
import DateTimeField from '@/components/molecules/DateTimeField';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getRollCallStatsApi } from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import type { RollCallStats } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import {
  ROLL_CALL_REASON_PALETTE,
  attendanceColor,
  formatCount,
  formatRatioPercent,
  toApiDate,
} from '@/utils/rollCall';
import { SectionHeader, sharedStyles } from '@/screens/RollCall/shared';

type Props = RootStackScreenProps<typeof ROUTES.rollCallStats>;

type Period = 'month' | 'week' | 'thirty' | 'custom';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'month', label: 'Bulan ini' },
  { key: 'week', label: '7 hari' },
  { key: 'thirty', label: '30 hari' },
  { key: 'custom', label: 'Pilih tanggal' },
];

function daysAgo(days: number): Date {
  const next = new Date();
  next.setDate(next.getDate() - days);
  return next;
}

function periodLabel(from: string, to: string): string {
  const format = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  return from && to ? `${format(from)} – ${format(to)}` : '';
}

// Statistik apel (GET /roll-calls/stats?from=&to=). Tanpa parameter backend memakai awal bulan
// ini s.d. hari ini. Persen per kompi dihitung klien, kehadiran terendah di atas.
export default function RollCallStatsScreen(props: Props) {
  const { navigation } = props;
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState(() => daysAgo(7));
  const [customTo, setCustomTo] = useState(() => new Date());
  const [stats, setStats] = useState<RollCallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const range = useMemo(() => {
    if (period === 'month') return {};
    if (period === 'week') return { from: toApiDate(daysAgo(6)), to: toApiDate(new Date()) };
    if (period === 'thirty') return { from: toApiDate(daysAgo(29)), to: toApiDate(new Date()) };
    return { from: toApiDate(customFrom), to: toApiDate(customTo) };
  }, [period, customFrom, customTo]);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);
      try {
        setStats(await getRollCallStatsApi(range));
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat statistik apel.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [range],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  const reasons = useMemo(() => {
    const list = [...(stats?.absence_reasons ?? [])].sort((a, b) => b.total - a.total);
    const sum = list.reduce((total, item) => total + item.total, 0);
    return list.map((item, index) => ({
      ...item,
      color: ROLL_CALL_REASON_PALETTE[index % ROLL_CALL_REASON_PALETTE.length],
      percent: sum > 0 ? Math.round((item.total / sum) * 100) : 0,
    }));
  }, [stats]);
  const absentTotal = reasons.reduce((total, item) => total + item.total, 0);

  // Kompi dengan data diurutkan dari kehadiran terendah; kompi yang belum pernah mengirim di bawah.
  const companies = useMemo(
    () =>
      [...(stats?.by_company ?? [])]
        .map(item => {
          const total = item.present + item.absent;
          return { ...item, hasData: total > 0, ratio: total > 0 ? item.present / total : 0 };
        })
        .sort((a, b) => (a.hasData === b.hasData ? a.ratio - b.ratio : a.hasData ? -1 : 1)),
    [stats],
  );
  const hasAttendance = !!stats && stats.present + stats.absent > 0;

  const subtitle = stats ? periodLabel(stats.period.from, stats.period.to) : undefined;

  return (
    <MainLayout title="Statistik Apel" subtitle={subtitle} variant="canvas" onBack={() => navigation.goBack()}>
      <ScrollView
        style={sharedStyles.flex}
        contentContainerStyle={sharedStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
        }>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}>
          {PERIODS.map(item => {
            const active = item.key === period;
            return (
              <PressableScale
                key={item.key}
                onPress={() => setPeriod(item.key)}
                accessibilityState={{ selected: active }}
                contentStyle={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        {period === 'custom' ? (
          <View style={styles.customRow}>
            <DateTimeField
              label="Dari"
              mode="date"
              value={customFrom}
              maximumDate={customTo}
              onChange={setCustomFrom}
              containerStyle={sharedStyles.flex}
            />
            <DateTimeField
              label="Sampai"
              mode="date"
              value={customTo}
              minimumDate={customFrom}
              maximumDate={new Date()}
              onChange={setCustomTo}
              containerStyle={sharedStyles.flex}
            />
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator style={sharedStyles.loader} color={colors.primary} />
        ) : errorMessage || !stats ? (
          <Text style={sharedStyles.empty}>{errorMessage ?? 'Statistik belum tersedia.'}</Text>
        ) : (
          <>
            <View style={[sharedStyles.cardRaised, styles.hero]}>
              <Text style={styles.heroLabel}>Kehadiran rata-rata</Text>
              <Text style={[styles.heroValue, { color: hasAttendance ? attendanceColor(stats.percentage) : colors.placeholder }]}>
                {hasAttendance ? `${stats.percentage}%` : '–'}
              </Text>
              <StatDividerRow
                size="md"
                style={styles.heroStats}
                items={[
                  { label: 'Agenda', value: formatCount(stats.agendas), flex: 0.8 },
                  { label: 'Hadir', value: formatCount(stats.present) },
                  { label: 'Tidak Hadir', value: formatCount(stats.absent) },
                ]}
              />
              <Text style={styles.heroNote}>Jumlah dari seluruh agenda pada periode ini.</Text>
            </View>

            <View style={styles.section}>
              <SectionHeader title="Sebaran Alasan Tidak Hadir" meta={formatCount(absentTotal)} />
              <View style={[sharedStyles.card, styles.reasonCard]}>
                {reasons.length === 0 ? (
                  <Text style={sharedStyles.rowMeta}>Tidak ada anggota yang tidak hadir pada periode ini.</Text>
                ) : (
                  <>
                    <View style={styles.stackBar}>
                      {reasons.map((item, index) => (
                        <View
                          key={`${item.reason}-${index}`}
                          style={[styles.stackSegment, { flexGrow: item.total, backgroundColor: item.color }]}
                        />
                      ))}
                    </View>
                    <View style={styles.legend}>
                      {reasons.map((item, index) => (
                        <View key={`${item.reason}-${index}`} style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                          <Text style={styles.legendName}>{item.reason}</Text>
                          <Text style={styles.legendTotal}>{formatCount(item.total)}</Text>
                          <Text style={styles.legendPercent}>{item.percent}%</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </View>

            {companies.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title="Per Kompi" meta="kehadiran terendah di atas" />
                <View style={sharedStyles.listCard}>
                  {companies.map((item, index) => (
                    <View
                      key={`${item.unit_id ?? item.company}-${index}`}
                      style={[sharedStyles.listRow, index > 0 && sharedStyles.listRowDivider]}>
                      <View style={styles.companyBody}>
                        <Text style={sharedStyles.rowTitle}>{item.company}</Text>
                        <Text style={sharedStyles.rowMeta}>
                          {item.hasData
                            ? `${formatCount(item.present)} hadir · ${formatCount(item.absent)} tidak hadir`
                            : 'Belum ada kiriman pada periode ini'}
                        </Text>
                      </View>
                      {item.hasData ? (
                        <Text style={[styles.companyPercent, { color: attendanceColor(item.ratio * 100) }]}>
                          {formatRatioPercent(item.ratio)}%
                        </Text>
                      ) : (
                        <Text style={[styles.companyPercent, styles.companyNoData]}>–</Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  chipScroll: { marginHorizontal: -20, marginBottom: 18 },
  chipRow: { gap: 8, paddingHorizontal: 20 },
  chip: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.heading },
  chipTextActive: { fontWeight: '700', color: colors.primaryForeground },
  customRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  hero: { paddingBottom: 12, marginBottom: 24 },
  heroLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  heroValue: { fontSize: 36, fontWeight: '800', letterSpacing: -0.8, lineHeight: 42, marginTop: 2 },
  heroStats: { marginTop: 12 },
  heroNote: { fontSize: 11, color: colors.placeholder, marginTop: 2 },
  section: { marginBottom: 24 },
  reasonCard: { gap: 14 },
  stackBar: { flexDirection: 'row', gap: 2, height: 10 },
  stackSegment: { minWidth: 4, height: 10, borderRadius: 999 },
  legend: { gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 8, height: 8, borderRadius: 999 },
  legendName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.heading },
  legendTotal: { fontSize: 13, fontWeight: '700', color: colors.heading },
  legendPercent: { width: 40, textAlign: 'right', fontSize: 12, color: colors.textMuted },
  companyBody: { flex: 1, gap: 2 },
  companyPercent: { fontSize: 14, fontWeight: '700' },
  companyNoData: { color: colors.placeholder },
});
