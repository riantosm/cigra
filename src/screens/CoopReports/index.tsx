import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import TrendBarChart from '@/components/molecules/TrendBarChart';
import CoopMyBillsList from '@/components/organisms/CoopMyBillsList';
import FilterSheet from '@/components/organisms/FilterSheet';
import MainLayout from '@/components/templates/MainLayout';
import { useCoopMyBills } from '@/hooks/useCoopMyBills';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getCoopOverviewApi } from '@/services/api/coopSalary.service';
import { colors } from '@/theme/colors';
import { cardShadow, cardShadowRaised } from '@/theme/shadows';
import type { CoopOverview, CoopReportListItem } from '@/types';
import { trendBarItems } from '@/utils/coopSalary';
import { cleanValue, extractErrorMessage, formatDateTime, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.coopReports>;

type Tab = 'reports' | 'mine';

const PER_PAGE = 12;
const SEARCH_DEBOUNCE_MS = 400;

// "Tagihan Koperasi" sisi pengelola (mode manager, `GET /coop-salary-report`): ringkasan rekap
// satuan + tren + daftar laporan per periode (filter tahun + cari judul/nama berkas). Tab "Tagihan
// Saya" (bila `capabilities.has_own_tagihan`) memuat `GET /coop-salary-report/me`.
export default function CoopReportsScreen(props: Props) {
  const { navigation } = props;

  const [tab, setTab] = useState<Tab>('reports');
  const [overview, setOverview] = useState<CoopOverview | null>(null);
  const [reports, setReports] = useState<CoopReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const yearOptionsRef = useRef<number[]>([]);

  const year = filters.year ? Number(filters.year) : undefined;
  const myBills = useCoopMyBills(tab === 'mine');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(
    async (page: number, mode: 'initial' | 'refresh' | 'more') => {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      if (mode === 'more') setIsLoadingMore(true);
      setErrorMessage(null);
      try {
        const result = await getCoopOverviewApi({ year, search, page, per_page: PER_PAGE });
        setOverview(result);
        if (result.manager?.year_options?.length) yearOptionsRef.current = result.manager.year_options;
        const next = result.manager?.reports ?? [];
        setReports(previous =>
          page <= 1 ? next : [...previous, ...next.filter(item => !previous.some(p => p.id === item.id))],
        );
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat rekap koperasi.'));
        if (mode !== 'more') setReports([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [year, search],
  );

  // Muat ulang tiap kata kunci / tahun berubah — setelah muat pertama, tanpa mengosongkan kartu.
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    load(1, hasLoadedRef.current ? 'refresh' : 'initial');
    hasLoadedRef.current = true;
  }, [load]);

  const manager = overview?.manager ?? null;
  const meta = manager?.meta ?? null;
  const canLoadMore = !!meta && meta.current_page < meta.last_page;
  const showTabs = !!overview?.capabilities.has_own_tagihan && !!overview.member;
  const canExport = !!overview?.capabilities.can_export;

  const tabs = showTabs ? (
    <SegmentedControl<Tab>
      options={[
        { value: 'reports', label: 'Rekap Satuan', icon: 'users' },
        { value: 'mine', label: 'Tagihan Saya', icon: 'receipt' },
      ]}
      value={tab}
      onChange={setTab}
      style={styles.tabs}
    />
  ) : null;

  // Mode member (tak berhak rekap satuan) → layar ini hanya menampilkan tagihan sendiri.
  const onlyMine = !!overview && !manager;
  useEffect(() => {
    if (onlyMine) setTab('mine');
  }, [onlyMine]);

  if (tab === 'mine') {
    return (
      <MainLayout title="Tagihan Koperasi" subtitle="Tagihan saya" variant="canvas" onBack={() => navigation.goBack()}>
        <CoopMyBillsList
          data={myBills.data}
          isLoading={myBills.isLoading}
          isRefreshing={myBills.isRefreshing}
          isLoadingMore={myBills.isLoadingMore}
          errorMessage={myBills.errorMessage}
          onRefresh={myBills.refresh}
          onEndReached={myBills.loadMore}
          onOpenRow={rowId => navigation.navigate(ROUTES.coopBillDetail, { rowId })}
          header={onlyMine ? null : tabs}
        />
      </MainLayout>
    );
  }

  const yearField = {
    key: 'year',
    label: 'Tahun',
    options: yearOptionsRef.current.map(option => ({ label: String(option), value: String(option) })),
  };
  const trendItems = trendBarItems(
    manager?.trend.labels,
    manager?.trend.totals,
    manager?.trend.members.map(count => `${count} anggota`),
  );
  const unitName = cleanValue(overview?.identity?.unit);

  return (
    <MainLayout
      title="Tagihan Koperasi"
      subtitle={unitName ?? 'Rekap satuan'}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <FlatList
        data={isLoading ? [] : reports}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => load(1, 'refresh')} tintColor={colors.primary} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (canLoadMore && !isLoadingMore && meta) load(meta.current_page + 1, 'more');
        }}
        ListHeaderComponent={
          <View>
            {tabs}
            <SearchFilterBar
              value={searchInput}
              onChangeText={setSearchInput}
              onClear={() => setSearchInput('')}
              placeholder="Cari judul / nama berkas"
              onFilterPress={yearField.options.length > 0 ? () => setIsFilterVisible(true) : undefined}
              activeFilterCount={year ? 1 : 0}
              style={styles.search}
            />
            {isLoading ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : manager && (manager.summary.periods > 0 || reports.length > 0) ? (
              <>
                <View style={styles.summaryCard}>
                  <View style={styles.kickerRow}>
                    <Icon name="wallet" size={16} color={colors.primary} />
                    <Text style={styles.kicker}>{year ? `Total Tahun ${year}` : 'Total Semua Periode'}</Text>
                  </View>
                  <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
                    {manager.summary.total_amount_formatted}
                  </Text>
                  <Text style={styles.totalMeta}>
                    {manager.summary.latest_period
                      ? `Terbaru: ${manager.summary.latest_period.period_label} · ${manager.summary.latest_period.total_amount_formatted}`
                      : 'Belum ada rekap terunggah'}
                  </Text>
                  <StatDividerRow
                    items={[
                      { label: 'Periode', value: String(manager.summary.periods), flex: 0.7 },
                      { label: 'Rata-rata / periode', value: manager.summary.average_amount_formatted, flex: 1.4 },
                      { label: 'Entri anggota', value: String(manager.summary.members) },
                    ]}
                  />
                </View>

                {trendItems.length > 0 ? (
                  <Card style={styles.trendCard}>
                    <View style={styles.trendHead}>
                      <Text style={styles.cardTitle}>Tren per Periode</Text>
                      <Text style={styles.trendHint}>total tagihan</Text>
                    </View>
                    <TrendBarChart items={trendItems} />
                  </Card>
                ) : null}

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Laporan Periode</Text>
                  <Text style={styles.sectionMeta}>{meta?.total ?? reports.length} laporan</Text>
                </View>
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? undefined : (
            <Text style={styles.empty}>
              {errorMessage ?? (search || year ? 'Tidak ada laporan yang cocok.' : 'Belum ada rekap koperasi.')}
            </Text>
          )
        }
        ItemSeparatorComponent={ListSeparator}
        renderItem={({ item }) => (
          <ReportCard
            item={item}
            isLatest={item.id === manager?.summary.latest_period?.id}
            onPress={() =>
              navigation.navigate(ROUTES.coopReportDetail, {
                reportId: item.id,
                periodLabel: item.period_label,
                canExport,
              })
            }
          />
        )}
        ListFooterComponent={
          isLoadingMore ? <ActivityIndicator style={styles.footerLoader} color={colors.primary} /> : undefined
        }
      />

      <FilterSheet
        visible={isFilterVisible}
        fields={[yearField]}
        value={filters}
        onApply={setFilters}
        onRequestClose={() => setIsFilterVisible(false)}
      />
    </MainLayout>
  );
}

function ReportCard(props: { item: CoopReportListItem; isLatest: boolean; onPress: () => void }) {
  const { item, isLatest, onPress } = props;
  const linkedPercent = item.member_count > 0 ? (item.linked_count / item.member_count) * 100 : 0;
  const uploadedAt = formatDateTime(item.uploaded_at);

  return (
    <PressableScale scaleTo={0.98} onPress={onPress} contentStyle={styles.reportCard}>
      <View style={styles.reportHead}>
        <Text style={styles.reportPeriod} numberOfLines={1}>
          {item.period_label}
        </Text>
        {isLatest ? (
          <View style={styles.latestBadge}>
            <Text style={styles.latestBadgeText}>TERBARU</Text>
          </View>
        ) : null}
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
  tabs: { marginBottom: 14 },
  search: { marginBottom: 14 },
  loader: { marginTop: 48 },
  summaryCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    marginBottom: 14,
    ...cardShadowRaised,
  },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  total: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.heading,
  },
  totalMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 16 },
  trendCard: { marginBottom: 8 },
  trendHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.heading },
  trendHint: { fontSize: 11, color: colors.placeholder },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  sectionMeta: { fontSize: 12, color: colors.textMuted },
  separator: { height: 12 },
  empty: {
    marginTop: 32,
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
  latestBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primarySurface,
  },
  latestBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, color: colors.primary },
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
