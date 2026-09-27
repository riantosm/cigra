import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import CoopDeltaPill from '@/components/molecules/CoopDeltaPill';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import TrendBarChart from '@/components/molecules/TrendBarChart';
import { colors } from '@/theme/colors';
import { cardShadow, cardShadowRaised } from '@/theme/shadows';
import type { CoopManagerBlock, CoopReportListItem } from '@/types';
import { coopDeltaFromSeries, coopDeltaPillLabel, trendBarItems } from '@/utils/coopSalary';
import { formatDateTime, joinFields } from '@/utils/format';

export interface CoopReportsPanelProps {
  manager: CoopManagerBlock;
  reports: CoopReportListItem[];
  isRefreshing: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  searchInput: string;
  onChangeSearch: (text: string) => void;
  year: number | undefined;
  onPressYear: (() => void) | undefined;
  onRefresh: () => void;
  onEndReached: () => void;
  onOpenReport: (report: { id: number; periodLabel: string }) => void;
  header?: ReactElement | null;
}

// Panel "Rekap Satuan" di menu Tagihan Koperasi (mode manager, blok `manager` dari
// `GET /coop-salary-report`): kartu rekap periode terbaru (+ peringatan NRP belum tertaut) →
// ringkasan & tren (pil tahun = `?year=`) → daftar laporan per periode (cari = `?search=`).
export default function CoopReportsPanel(props: CoopReportsPanelProps) {
  const {
    manager,
    reports,
    isRefreshing,
    isLoadingMore,
    errorMessage,
    searchInput,
    onChangeSearch,
    year,
    onPressYear,
    onRefresh,
    onEndReached,
    onOpenReport,
    header,
  } = props;

  const latest = manager.summary.latest_period;
  const latestReport = reports.find(report => report.id === latest?.id) ?? null;
  const memberTrend = manager.trend.members ?? [];
  const latestMembers = latestReport?.member_count ?? memberTrend[memberTrend.length - 1] ?? null;
  const unlinked = latestReport?.unlinked_count ?? manager.summary.latest_unlinked_count ?? 0;
  const delta = coopDeltaFromSeries(manager.trend.totals);
  const previousLabel = manager.trend.labels[manager.trend.labels.length - 2];
  const trendItems = trendBarItems(
    manager.trend.labels,
    manager.trend.totals,
    memberTrend.map(count => `${count} anggota`),
  );
  const hasData = manager.summary.periods > 0 || reports.length > 0;

  return (
    <FlatList
      data={reports}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      onEndReachedThreshold={0.4}
      onEndReached={onEndReached}
      ListHeaderComponent={
        <View>
          {header}
          {latest ? (
            <PressableScale
              scaleTo={0.98}
              onPress={() => onOpenReport({ id: latest.id, periodLabel: latest.period_label })}
              contentStyle={styles.heroCard}>
              <View style={styles.heroBody}>
                <View style={styles.kickerRow}>
                  <Text style={styles.kicker} numberOfLines={1}>
                    Rekap {latest.period_label}
                  </Text>
                  <View style={styles.latestBadge}>
                    <Text style={styles.latestBadgeText}>TERBARU</Text>
                  </View>
                </View>
                <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
                  {latest.total_amount_formatted}
                </Text>
                <View style={styles.compareRow}>
                  {delta && previousLabel ? <CoopDeltaPill trend={delta.trend} label={coopDeltaPillLabel(delta)} /> : null}
                  <Text style={styles.compareText}>
                    {joinFields(
                      delta && previousLabel ? `vs ${previousLabel}` : 'Periode pertama yang tercatat',
                      latestMembers != null ? `${latestMembers} anggota` : null,
                    )}
                  </Text>
                </View>
                {unlinked > 0 ? (
                  <View style={styles.warning}>
                    <Icon name="alert-triangle" size={15} color={colors.warningText} />
                    <Text style={styles.warningText}>{unlinked} anggota belum tertaut ke akun personel</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.heroFooter}>
                <Text style={styles.heroLink}>Buka rekap periode</Text>
                <Icon name="chevron-right" size={16} color={colors.primary} />
              </View>
            </PressableScale>
          ) : null}

          {hasData ? (
            <Card style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Ringkasan</Text>
                {onPressYear ? (
                  <PressableScale onPress={onPressYear} accessibilityLabel="Pilih tahun" contentStyle={styles.yearPill}>
                    <Icon name="calendar" size={14} color={colors.primary} />
                    <Text style={styles.yearText}>{year ? String(year) : 'Semua tahun'}</Text>
                    <Icon name="chevron-down" size={13} color={colors.textMuted} />
                  </PressableScale>
                ) : null}
              </View>
              {trendItems.length > 1 ? <TrendBarChart items={trendItems} style={styles.chart} /> : null}
              <StatDividerRow
                border={trendItems.length > 1 ? 'top' : 'none'}
                items={[
                  { label: 'Total', value: manager.summary.total_amount_formatted, flex: 1.2 },
                  { label: 'Rata-rata / periode', value: manager.summary.average_amount_formatted, flex: 1.2 },
                  { label: 'Periode', value: String(manager.summary.periods), flex: 0.6 },
                ]}
              />
            </Card>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Laporan Periode</Text>
            <Text style={styles.sectionMeta}>{manager.meta?.total ?? reports.length} laporan</Text>
          </View>
          <SearchFilterBar
            value={searchInput}
            onChangeText={onChangeSearch}
            onClear={() => onChangeSearch('')}
            placeholder="Cari judul atau nama berkas"
            style={styles.search}
          />
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {errorMessage ??
            (searchInput.trim() || year ? 'Tidak ada laporan yang cocok.' : 'Belum ada rekap koperasi yang diunggah.')}
        </Text>
      }
      ItemSeparatorComponent={ListSeparator}
      renderItem={({ item }) => (
        <ReportCard item={item} onPress={() => onOpenReport({ id: item.id, periodLabel: item.period_label })} />
      )}
      ListFooterComponent={
        isLoadingMore ? <ActivityIndicator style={styles.footerLoader} color={colors.primary} /> : undefined
      }
    />
  );
}

function ReportCard(props: { item: CoopReportListItem; onPress: () => void }) {
  const { item, onPress } = props;
  const linkedPercent = item.member_count > 0 ? (item.linked_count / item.member_count) * 100 : 0;
  const uploadedAt = formatDateTime(item.uploaded_at);

  return (
    <PressableScale scaleTo={0.98} onPress={onPress} contentStyle={styles.reportCard}>
      <View style={styles.reportHead}>
        <Text style={styles.reportPeriod} numberOfLines={1}>
          {item.period_label}
        </Text>
        <Icon name="chevron-right" size={18} color={colors.placeholder} />
      </View>
      <View style={styles.reportFile}>
        <Icon name="file" size={13} color={colors.textMuted} />
        <Text style={styles.reportFileText} numberOfLines={1}>
          {joinFields(item.title, item.source_filename) || '-'}
        </Text>
      </View>
      <View style={styles.reportAmountRow}>
        <Text style={styles.reportAmount} numberOfLines={1} adjustsFontSizeToFit>
          {item.total_amount_formatted}
        </Text>
        <Text style={styles.reportMembers}>{item.member_count} anggota</Text>
      </View>
      <View style={styles.linkTrack}>
        <View style={[styles.linkFill, { width: `${Math.max(linkedPercent, item.linked_count > 0 ? 2 : 0)}%` }]} />
      </View>
      <View style={styles.linkLegend}>
        <Text style={styles.linkedText}>{item.linked_count} tertaut</Text>
        {item.unlinked_count > 0 ? (
          <>
            <Text style={styles.legendDot}>•</Text>
            <Text style={styles.unlinkedText}>{item.unlinked_count} belum tertaut</Text>
          </>
        ) : null}
      </View>
      {uploadedAt ? <Text style={styles.uploadedAt}>Diunggah {uploadedAt}</Text> : null}
    </PressableScale>
  );
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 14,
    ...cardShadowRaised,
  },
  heroBody: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  kicker: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  latestBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primarySurface,
  },
  latestBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, color: colors.primary },
  total: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.heading,
    marginBottom: 10,
  },
  compareRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  compareText: { fontSize: 12, color: colors.textMuted },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.warningSurface,
  },
  warningText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.warningText },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  heroLink: { fontSize: 13, fontWeight: '600', color: colors.primary },
  card: { marginBottom: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.heading },
  yearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
  },
  yearText: { fontSize: 13, fontWeight: '700', color: colors.heading },
  chart: { marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  sectionMeta: { fontSize: 12, color: colors.textMuted },
  search: { marginBottom: 12 },
  separator: { height: 12 },
  empty: {
    marginTop: 24,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
  },
  footerLoader: { marginVertical: 18 },
  reportCard: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  reportHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportPeriod: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.heading },
  reportFile: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 },
  reportFileText: { flex: 1, fontSize: 12, color: colors.textMuted },
  reportAmountRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  reportAmount: { flexShrink: 1, fontSize: 18, fontWeight: '800', color: colors.heading },
  reportMembers: { fontSize: 12, color: colors.textMuted },
  linkTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.warningSurface,
    overflow: 'hidden',
  },
  linkFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  linkLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 },
  linkedText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  legendDot: { fontSize: 11, color: colors.dividerOnGradient },
  unlinkedText: { fontSize: 11, fontWeight: '600', color: colors.warningText },
  uploadedAt: {
    fontSize: 11,
    color: colors.placeholder,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
});
