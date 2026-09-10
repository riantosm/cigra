import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import { ROUTES } from '@/navigation/paths';
import AcademyTabScreen from '@/screens/Academy/shared/AcademyTabScreen';
import type { AcademyTabNav } from '@/screens/Academy/shared/types';
import {
  getAcademyCommanderOverviewApi,
  getAcademySummaryApi,
} from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyCommanderOverview, AcademySummaryCommander } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { formatPercent, formatScore } from '@/utils/academy';

export default function AcademyCommanderOverview() {
  const navigation = useNavigation<AcademyTabNav>();

  const [overview, setOverview] = useState<AcademyCommanderOverview | null>(null);
  const [attention, setAttention] = useState<AcademySummaryCommander | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    const [overviewRes, summaryRes] = await Promise.allSettled([
      getAcademyCommanderOverviewApi(),
      getAcademySummaryApi(),
    ]);
    if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
    if (summaryRes.status === 'fulfilled') {
      setAttention(summaryRes.value.commander_overview ?? null);
    }
    if (overviewRes.status === 'rejected' && summaryRes.status === 'rejected') {
      setError(extractErrorMessage(overviewRes.reason, 'Data gagal dimuat.'));
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

  const needAttention = attention
    ? attention.not_completed + attention.failed + attention.pending_verifications
    : 0;

  const attentionRows = [
    {
      key: 'not_completed',
      label: 'anggota belum menyelesaikan program',
      value: attention?.not_completed ?? 0,
      icon: 'clipboard-check' as const,
      surface: colors.warningSurface,
      color: colors.warningText,
    },
    {
      key: 'failed',
      label: 'anggota tidak lulus assessment',
      value: attention?.failed ?? 0,
      icon: 'close' as const,
      surface: colors.dangerSurface,
      color: colors.danger,
    },
    {
      key: 'pending',
      label: 'hasil praktik menunggu verifikasi',
      value: attention?.pending_verifications ?? 0,
      icon: 'clock' as const,
      surface: colors.primarySurface,
      color: colors.primary,
    },
  ];

  const top = overview?.top_competencies ?? [];

  return (
    <AcademyTabScreen
      loading={loading}
      error={error}
      onRetry={() => load('initial')}
      onRefresh={() => load('refresh')}
      refreshing={refreshing}>
      <Text style={styles.sectionTitle}>Metrik Utama</Text>
      <View style={styles.grid}>
        <Metric value={String(overview?.active_programs ?? 0)} label="Program Aktif" />
        <Metric
          value={formatPercent(overview?.completion_rate_percentage)}
          label="Completion Rate"
        />
        <Metric value={formatPercent(overview?.pass_rate_percentage)} label="Pass Rate" />
        <Metric value={String(needAttention)} label="Perlu Perhatian" danger />
      </View>

      <View style={styles.statStrip}>
        <StripCell value={String(overview?.total_participants ?? 0)} label="Total Peserta" />
        <View style={styles.stripDivider} />
        <StripCell value={formatScore(overview?.average_final_score)} label="Rata-rata Nilai" />
        <View style={styles.stripDivider} />
        <StripCell value={String(overview?.total_programs ?? 0)} label="Total Program" />
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Perlu Perhatian</Text>
        <PressableScale onPress={() => navigation.navigate(ROUTES.academyCmdAttention)}>
          <Text style={styles.link}>Lihat Semua</Text>
        </PressableScale>
      </View>
      {attentionRows.map(row => (
        <PressableScale
          key={row.key}
          scaleTo={0.98}
          onPress={() => navigation.navigate(ROUTES.academyCmdAttention)}>
          <Card style={styles.attentionRow}>
            <View style={[styles.attentionIcon, { backgroundColor: row.surface }]}>
              <Icon name={row.icon} size={17} color={row.color} />
            </View>
            <Text style={styles.attentionText}>
              <Text style={styles.attentionValue}>{row.value}</Text> {row.label}
            </Text>
            <Icon name="chevron-right" size={16} color={colors.placeholder} />
          </Card>
        </PressableScale>
      ))}

      {top.length > 0 ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Kualifikasi Teratas</Text>
            <PressableScale onPress={() => navigation.navigate(ROUTES.academyCmdCompetency)}>
              <Text style={styles.link}>Lihat Semua</Text>
            </PressableScale>
          </View>
          <Card style={styles.topCard}>
            {top.map((c, index) => (
              <View
                key={c.competency_name}
                style={[styles.topRow, index < top.length - 1 && styles.topRowBorder]}>
                <Text style={styles.topName} numberOfLines={1}>
                  {c.competency_name}
                </Text>
                <Text style={styles.topValue}>{c.total_achieved}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </AcademyTabScreen>
  );
}

function Metric({ value, label, danger }: { value: string; label: string; danger?: boolean }) {
  return (
    <View style={[styles.metric, danger && styles.metricDanger]}>
      <Text style={[styles.metricValue, danger && styles.metricValueDanger]}>{value}</Text>
      <Text style={[styles.metricLabel, danger && styles.metricLabelDanger]}>{label}</Text>
    </View>
  );
}

function StripCell({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stripCell}>
      <Text style={styles.stripValue}>{value}</Text>
      <Text style={styles.stripLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.heading, marginTop: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  link: { fontSize: 13, fontWeight: '600', color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 16,
  },
  metricDanger: { borderColor: colors.dangerMuted, backgroundColor: colors.dangerSurface },
  metricValue: { fontSize: 28, fontWeight: '800', color: colors.heading, lineHeight: 30 },
  metricValueDanger: { color: colors.dangerText },
  metricLabel: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  metricLabelDanger: { color: colors.dangerText },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    marginTop: 12,
  },
  stripCell: { flex: 1, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center' },
  stripDivider: { width: 1, backgroundColor: colors.borderSoft },
  stripValue: { fontSize: 18, fontWeight: '800', color: colors.heading },
  stripLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  attentionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attentionText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
  attentionValue: { fontWeight: '800', color: colors.heading },
  topCard: { paddingHorizontal: 16, paddingVertical: 4 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
  },
  topRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  topName: { flex: 1, fontSize: 14, color: colors.text },
  topValue: { fontSize: 16, fontWeight: '800', color: colors.heading },
});
