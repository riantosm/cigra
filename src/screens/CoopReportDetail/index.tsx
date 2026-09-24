import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import GradientAvatar from '@/components/atoms/GradientAvatar';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import CoopCategoryBreakdown from '@/components/molecules/CoopCategoryBreakdown';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import FilterSheet from '@/components/organisms/FilterSheet';
import type { FilterField } from '@/components/organisms/FilterSheet';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import type { CoopReportDetailParams } from '@/services/api/coopSalary.service';
import { coopReportExportPath, getCoopReportDetailApi } from '@/services/api/coopSalary.service';
import { colors } from '@/theme/colors';
import { cardShadow, cardShadowRaised, tabBarShadow } from '@/theme/shadows';
import type { CoopExportFormat, CoopReportDetail, CoopReportMemberRow } from '@/types';
import { coopCategoryLines } from '@/utils/coopSalary';
import { exportCoopFile } from '@/utils/coopSalaryExport';
import { cleanValue, extractErrorMessage, formatDateTime, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.coopReportDetail>;

const PER_PAGE = 25;
const SEARCH_DEBOUNCE_MS = 400;

const SORT_PARAMS: Record<string, Pick<CoopReportDetailParams, 'sort' | 'direction'>> = {
  total_desc: { sort: 'total', direction: 'desc' },
  total_asc: { sort: 'total', direction: 'asc' },
  name_asc: { sort: 'name', direction: 'asc' },
  nrp_asc: { sort: 'nrp', direction: 'asc' },
};

const FILTER_FIELDS: FilterField[] = [
  {
    key: 'category',
    label: 'Jenis Tagihan',
    options: coopCategoryLines([]).map(line => ({ label: line.label, value: line.key })),
  },
  {
    key: 'linkage',
    label: 'Status NRP',
    options: [
      { label: 'Tertaut', value: 'linked' },
      { label: 'Belum tertaut', value: 'unlinked' },
    ],
  },
  {
    key: 'sort',
    label: 'Urutkan',
    options: [
      { label: 'Total terbesar', value: 'total_desc' },
      { label: 'Total terkecil', value: 'total_asc' },
      { label: 'Nama A–Z', value: 'name_asc' },
      { label: 'NRP', value: 'nrp_asc' },
    ],
  },
];

function personLabel(rank: string | null | undefined, name: string): string {
  return [cleanValue(rank), cleanValue(name)].filter(Boolean).join(' ') || name;
}

// Detail rekap satu periode (pengelola, `GET /coop-salary-report/{report}`): total satuan +
// keterkaitan NRP + berkas sumber, alokasi per jenis, 5 tagihan terbesar, lalu matriks anggota
// (cari nama/NRP, filter jenis & status NRP, urut) berpaginasi. Ekspor Excel/PDF bila can_export.
export default function CoopReportDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { reportId, periodLabel, canExport } = route.params;

  const [detail, setDetail] = useState<CoopReportDetail | null>(null);
  const [rows, setRows] = useState<CoopReportMemberRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [exporting, setExporting] = useState<CoopExportFormat | null>(null);
  const [modal, setModal] = useState<{ variant: 'success' | 'error'; title: string; message: string } | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(
    async (page: number, mode: 'initial' | 'refresh' | 'list' | 'more') => {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      if (mode === 'list') setIsListLoading(true);
      if (mode === 'more') setIsLoadingMore(true);
      setErrorMessage(null);
      try {
        const result = await getCoopReportDetailApi(reportId, {
          page,
          per_page: PER_PAGE,
          search,
          category: filters.category,
          linkage: filters.linkage as CoopReportDetailParams['linkage'],
          ...(filters.sort ? SORT_PARAMS[filters.sort] : {}),
        });
        setDetail(result);
        setRows(previous =>
          page <= 1 ? result.rows : [...previous, ...result.rows.filter(row => !previous.some(p => p.id === row.id))],
        );
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat detail rekap.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsListLoading(false);
        setIsLoadingMore(false);
      }
    },
    [reportId, search, filters],
  );

  useEffect(() => {
    load(1, hasLoadedRef.current ? 'list' : 'initial');
    hasLoadedRef.current = true;
  }, [load]);

  async function handleExport(format: CoopExportFormat) {
    if (exporting) return;
    setExporting(format);
    try {
      const slug = detail?.report.period_slug ?? String(reportId);
      const result = await exportCoopFile(coopReportExportPath(reportId, format), format, `rekap-koperasi-${slug}`);
      if (result.savedToDownloads) {
        setModal({ variant: 'success', title: 'Berkas Diunduh', message: 'Rekap Excel tersimpan di folder Unduhan.' });
      }
    } catch (error) {
      setModal({ variant: 'error', title: 'Gagal Mengekspor', message: extractErrorMessage(error, 'Gagal mengekspor rekap.') });
    } finally {
      setExporting(null);
    }
  }

  function openMember(rowId: number) {
    navigation.navigate(ROUTES.coopBillDetail, {
      rowId,
      reportId,
      periodLabel: detail?.report.period_label ?? periodLabel,
    });
  }

  const report = detail?.report ?? null;
  const meta = detail?.meta ?? null;
  const canLoadMore = !!meta && meta.current_page < meta.last_page;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const uploadedAt = formatDateTime(report?.uploaded_at);
  const showFooter = !!canExport && !!report;

  return (
    <MainLayout
      title={report?.period_label ?? periodLabel ?? 'Detail Rekap'}
      subtitle={joinFields('Rekap satuan', report?.title) || 'Rekap satuan'}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : !report ? (
        <Text style={styles.error}>{errorMessage ?? 'Rekap tidak ditemukan.'}</Text>
      ) : (
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={[styles.content, showFooter && styles.contentWithFooter]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => load(1, 'refresh')} tintColor={colors.primary} />
            }>
            <View style={styles.heroCard}>
              <Text style={styles.kicker}>Total Tagihan Satuan</Text>
              <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
                {report.total_amount_formatted}
              </Text>
              <StatDividerRow
                border="both"
                size="md"
                items={[
                  { label: 'Anggota', value: String(report.member_count) },
                  { label: 'Tertaut', value: String(report.linked_count), valueColor: colors.primary },
                  {
                    label: 'Belum tertaut',
                    value: String(report.unlinked_count),
                    valueColor: report.unlinked_count > 0 ? colors.warningText : undefined,
                    flex: 1.2,
                  },
                ]}
                style={styles.heroStats}
              />
              <View style={styles.fileRow}>
                <Icon name="file" size={14} color={colors.textMuted} />
                <View style={styles.fileBody}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {cleanValue(report.source_filename) ?? report.title}
                  </Text>
                  {report.uploaded_by || uploadedAt ? (
                    <Text style={styles.fileMeta} numberOfLines={2}>
                      {joinFields(report.uploaded_by ? `Diunggah ${report.uploaded_by}` : 'Diunggah', uploadedAt)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            <Card style={styles.card}>
              <View style={styles.kickerRow}>
                <Icon name="receipt" size={18} color={colors.primary} />
                <Text style={styles.sectionKicker}>Alokasi per Jenis</Text>
              </View>
              <CoopCategoryBreakdown lines={coopCategoryLines(report.categories)} variant="full" />
            </Card>

            {detail && detail.top_members.length > 0 ? (
              <Card style={[styles.card, styles.listCard]}>
                <Text style={styles.listCardTitle}>{detail.top_members.length} Tagihan Terbesar</Text>
                {detail.top_members.map((member, index) => (
                  <PressableScale
                    key={member.id}
                    scaleTo={0.98}
                    onPress={() => openMember(member.id)}
                    contentStyle={[styles.topRow, index < detail.top_members.length - 1 && styles.rowDivider]}>
                    <View style={[styles.rankChip, index === 0 && styles.rankChipFirst]}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.topName} numberOfLines={1}>
                        {personLabel(member.rank_name, member.name)}
                      </Text>
                      <Text style={styles.rowMeta}>NRP {member.nrp}</Text>
                    </View>
                    <Text style={styles.rowAmount}>{member.total_formatted}</Text>
                  </PressableScale>
                ))}
              </Card>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Daftar Anggota</Text>
              <Text style={styles.sectionMeta}>{meta?.total ?? rows.length} anggota</Text>
            </View>
            <SearchFilterBar
              value={searchInput}
              onChangeText={setSearchInput}
              onClear={() => setSearchInput('')}
              placeholder="Cari nama atau NRP"
              onFilterPress={() => setIsFilterVisible(true)}
              activeFilterCount={activeFilterCount}
              style={styles.search}
            />

            {isListLoading ? (
              <ActivityIndicator style={styles.listLoader} color={colors.primary} />
            ) : rows.length === 0 ? (
              <Text style={styles.emptyRows}>{errorMessage ?? 'Tidak ada anggota yang cocok.'}</Text>
            ) : (
              <Card style={styles.listCard}>
                {rows.map((row, index) => (
                  <PressableScale
                    key={row.id}
                    scaleTo={0.98}
                    onPress={() => openMember(row.id)}
                    contentStyle={[styles.memberRow, index < rows.length - 1 && styles.rowDivider]}>
                    {row.is_linked ? (
                      <GradientAvatar
                        label={(cleanValue(row.name) ?? '?').charAt(0).toUpperCase()}
                        gradientStart={colors.gradientPrimaryStart}
                        gradientEnd={colors.gradientPrimaryEnd}
                        size={40}
                      />
                    ) : (
                      <View style={styles.plainAvatar}>
                        <Text style={styles.plainAvatarText}>{(cleanValue(row.name) ?? '?').charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.rowBody}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {personLabel(row.rank_name, row.name)}
                      </Text>
                      <View style={styles.memberMetaRow}>
                        <Text style={styles.rowMeta}>{row.nrp}</Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={row.is_linked ? styles.linkedText : styles.unlinkedText}>
                          {row.is_linked ? 'Tertaut' : 'Belum tertaut'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.rowAmount}>{row.total_formatted}</Text>
                    <Icon name="chevron-right" size={16} color={colors.placeholder} />
                  </PressableScale>
                ))}
              </Card>
            )}

            {canLoadMore && !isListLoading && meta ? (
              <PressableScale
                scaleTo={0.97}
                disabled={isLoadingMore}
                onPress={() => load(meta.current_page + 1, 'more')}
                style={styles.moreWrap}
                contentStyle={styles.moreButton}>
                {isLoadingMore ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Icon name="chevron-down" size={15} color={colors.primary} />
                    <Text style={styles.moreText}>
                      Muat lebih banyak · {rows.length} dari {meta.total}
                    </Text>
                  </>
                )}
              </PressableScale>
            ) : null}
          </ScrollView>

          {showFooter ? (
            <View style={styles.footer}>
              <PressableScale
                scaleTo={0.97}
                disabled={exporting !== null}
                onPress={() => handleExport('excel')}
                style={styles.footerButton}
                contentStyle={styles.secondaryButton}>
                {exporting === 'excel' ? (
                  <ActivityIndicator color={colors.success} />
                ) : (
                  <>
                    <Icon name="spreadsheet" size={18} color={colors.success} />
                    <Text style={styles.secondaryButtonText}>Ekspor Excel</Text>
                  </>
                )}
              </PressableScale>
              <GradientButton
                label="Cetak PDF"
                icon="printer"
                height={52}
                loading={exporting === 'pdf'}
                disabled={exporting !== null}
                onPress={() => handleExport('pdf')}
                style={styles.footerButton}
              />
            </View>
          ) : null}
        </View>
      )}

      <FilterSheet
        visible={isFilterVisible}
        fields={FILTER_FIELDS}
        value={filters}
        onApply={setFilters}
        onRequestClose={() => setIsFilterVisible(false)}
      />

      <StatusModal
        visible={modal !== null}
        variant={modal?.variant ?? 'success'}
        icon={modal?.variant === 'success' ? 'download' : undefined}
        title={modal?.title ?? ''}
        message={modal?.message ?? ''}
        onRequestClose={() => setModal(null)}
        primaryAction={{ label: 'Tutup', onPress: () => setModal(null) }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  error: {
    marginTop: 48,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  contentWithFooter: { paddingBottom: 110 },
  heroCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    marginBottom: 14,
    ...cardShadowRaised,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: 6,
  },
  total: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.heading,
    marginBottom: 16,
  },
  heroStats: { marginBottom: 12 },
  fileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  fileBody: { flex: 1, minWidth: 0, gap: 2 },
  fileName: { fontSize: 12, fontWeight: '600', color: colors.textBody },
  fileMeta: { fontSize: 11, color: colors.placeholder },
  card: { marginBottom: 14 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionKicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  listCard: { paddingVertical: 4, paddingHorizontal: 14 },
  listCardTitle: { fontSize: 14, fontWeight: '700', color: colors.heading, paddingTop: 10, paddingBottom: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rankChip: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
  },
  rankChipFirst: { backgroundColor: colors.primarySurface },
  rankText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  topName: { fontSize: 13, fontWeight: '600', color: colors.heading },
  rowMeta: { fontSize: 11, color: colors.textMuted },
  rowAmount: { fontSize: 13, fontWeight: '700', color: colors.heading },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  sectionMeta: { fontSize: 12, color: colors.textMuted },
  search: { marginBottom: 12 },
  listLoader: { marginVertical: 24 },
  emptyRows: {
    marginVertical: 24,
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  plainAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralSurface,
  },
  plainAvatarText: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  memberName: { fontSize: 14, fontWeight: '700', color: colors.heading },
  memberMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaDot: { fontSize: 11, color: colors.dividerOnGradient },
  linkedText: { fontSize: 11, fontWeight: '600', color: colors.success },
  unlinkedText: { fontSize: 11, fontWeight: '600', color: colors.warningText },
  moreWrap: { alignSelf: 'center', marginTop: 12 },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.chipSurface,
  },
  moreText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  footerButton: { flex: 1 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '600', color: colors.heading },
});
