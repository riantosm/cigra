import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import AuthToggle from '@/components/molecules/AuthToggle';
import EmptyState from '@/components/molecules/EmptyState';
import CoopMyBillsList from '@/components/organisms/CoopMyBillsList';
import FilterSheet from '@/components/organisms/FilterSheet';
import MainLayout from '@/components/templates/MainLayout';
import { useCoopMyBills } from '@/hooks/useCoopMyBills';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import CoopReportsPanel from '@/screens/Coop/ReportsPanel';
import { getCoopOverviewApi, isCoopForbiddenError } from '@/services/api/coopSalary.service';
import { colors } from '@/theme/colors';
import { smallButtonShadow } from '@/theme/shadows';
import type { CoopOverview, CoopReportListItem } from '@/types';
import { isCoopManagerView } from '@/utils/coopSalary';
import { cleanValue, extractErrorMessage, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.coop>;

type Tab = 'reports' | 'mine';

const PER_PAGE = 12;
const SEARCH_DEBOUNCE_MS = 400;

// Menu "Tagihan Koperasi" — satu pintu untuk semua peran, isinya mengikuti `mode` dari
// `GET /coop-salary-report`:
// - `manager` (rekap satuan) → toggle Rekap Satuan / Tagihan Saya (toggle hanya bila blok `member`
//   terisi) + ikon Juyar di header bila `capabilities.can_manage_reports`;
// - `member` → langsung Tagihan Saya (`GET /coop-salary-report/me`).
// 403 (modul belum aktif untuk satuan) → tampilan kosong berisi pesan backend.
export default function CoopScreen(props: Props) {
  const { navigation } = props;

  const [tab, setTab] = useState<Tab>('reports');
  const [overview, setOverview] = useState<CoopOverview | null>(null);
  const [reports, setReports] = useState<CoopReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isYearSheetVisible, setIsYearSheetVisible] = useState(false);
  const yearOptionsRef = useRef<number[]>([]);
  const hasLoadedRef = useRef(false);

  const year = filters.year ? Number(filters.year) : undefined;

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
        setForbiddenMessage(null);
        if (result.manager?.year_options?.length) yearOptionsRef.current = result.manager.year_options;
        const next = result.manager?.reports ?? [];
        setReports(previous =>
          page <= 1 ? next : [...previous, ...next.filter(item => !previous.some(p => p.id === item.id))],
        );
      } catch (error) {
        if (isCoopForbiddenError(error)) {
          setForbiddenMessage(
            extractErrorMessage(error, 'Tagihan Koperasi belum diaktifkan untuk satuan Anda.'),
          );
        } else {
          setErrorMessage(extractErrorMessage(error, 'Gagal memuat tagihan koperasi.'));
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [year, search],
  );

  // Muat ulang tiap kata kunci / tahun berubah — setelah muat pertama tanpa mengosongkan layar.
  useEffect(() => {
    load(1, hasLoadedRef.current ? 'refresh' : 'initial');
    hasLoadedRef.current = true;
  }, [load]);

  // Rekap Satuan hanya untuk mode manager yang berhak (lihat `isCoopManagerView`); selain itu layar
  // ini langsung Tagihan Saya, meski backend masih menyertakan blok `manager`.
  const manager = isCoopManagerView(overview) ? overview?.manager ?? null : null;
  const member = overview?.member ?? null;
  const capabilities = overview?.capabilities ?? null;
  const showTabs = !!manager && !!member;
  const activeTab: Tab = manager ? (showTabs ? tab : 'reports') : 'mine';
  const myBills = useCoopMyBills(!!overview && activeTab === 'mine');

  const meta = manager?.meta ?? null;
  const canLoadMore = !!meta && meta.current_page < meta.last_page;
  const yearOptions = yearOptionsRef.current;

  const identity = myBills.data?.identity ?? overview?.identity ?? null;
  const ownName = [cleanValue(identity?.rank ?? myBills.data?.rows[0]?.rank_name), cleanValue(identity?.full_name)]
    .filter(Boolean)
    .join(' ');
  const subtitle = !overview
    ? undefined
    : activeTab === 'reports'
      ? cleanValue(overview?.identity?.unit) ?? 'Rekap satuan'
      : joinFields(ownName, identity?.service_number ? `NRP ${identity.service_number}` : null) || 'Tagihan saya';

  const tabs = showTabs ? (
    <AuthToggle<Tab>
      options={[
        { value: 'reports', label: 'Rekap Satuan', icon: 'users' },
        { value: 'mine', label: 'Tagihan Saya', icon: 'wallet' },
      ]}
      value={tab}
      onChange={setTab}
      style={styles.tabs}
    />
  ) : null;

  const juyarButton = capabilities?.can_manage_reports ? (
    <PressableScale
      accessibilityLabel="Kelola Juyar"
      onPress={() => navigation.navigate(ROUTES.coopJuyars)}
      contentStyle={styles.squareButton}>
      <Icon name="users" size={20} color={colors.primary} />
    </PressableScale>
  ) : undefined;

  function renderBody() {
    if (isLoading) return <ActivityIndicator style={styles.loader} color={colors.primary} />;
    if (forbiddenMessage) {
      return <EmptyState icon="wallet" title="Modul belum aktif" message={forbiddenMessage} style={styles.state} />;
    }
    if (!overview) return <Text style={styles.error}>{errorMessage ?? 'Tagihan koperasi tidak tersedia.'}</Text>;
    if (activeTab === 'reports' && manager) {
      return (
        <CoopReportsPanel
          manager={manager}
          reports={reports}
          isRefreshing={isRefreshing}
          isLoadingMore={isLoadingMore}
          errorMessage={errorMessage}
          searchInput={searchInput}
          onChangeSearch={setSearchInput}
          year={year}
          onPressYear={yearOptions.length > 0 ? () => setIsYearSheetVisible(true) : undefined}
          onRefresh={() => load(1, 'refresh')}
          onEndReached={() => {
            if (canLoadMore && !isLoadingMore && meta) load(meta.current_page + 1, 'more');
          }}
          onOpenReport={report =>
            navigation.navigate(ROUTES.coopReportDetail, {
              reportId: report.id,
              periodLabel: report.periodLabel,
              canExport: !!capabilities?.can_export,
            })
          }
          header={tabs}
        />
      );
    }
    if (!member && !overview.identity) {
      // Akun tanpa data personil (mis. admin murni) dan tanpa hak rekap satuan. Selain kasus ini,
      // Tagihan Saya selalu dimuat dari `/me` (sumber kebenaran tagihan sendiri).
      return (
        <EmptyState
          icon="receipt"
          title="Belum ada tagihan"
          message="Akun ini belum tertaut ke data personil, jadi tidak punya tagihan koperasi."
          style={styles.state}
        />
      );
    }
    return (
      <CoopMyBillsList
        data={myBills.data}
        isLoading={myBills.isLoading}
        isRefreshing={myBills.isRefreshing}
        isLoadingMore={myBills.isLoadingMore}
        errorMessage={myBills.errorMessage}
        onRefresh={myBills.refresh}
        onEndReached={myBills.loadMore}
        onOpenRow={rowId => navigation.navigate(ROUTES.coopBillDetail, { rowId })}
        header={tabs}
      />
    );
  }

  return (
    <MainLayout
      title="Tagihan Koperasi"
      subtitle={subtitle}
      variant="canvas"
      right={juyarButton}
      onBack={() => navigation.goBack()}>
      {renderBody()}

      <FilterSheet
        visible={isYearSheetVisible}
        fields={[
          {
            key: 'year',
            label: 'Tahun',
            options: yearOptions.map(option => ({ label: String(option), value: String(option) })),
          },
        ]}
        value={filters}
        onApply={setFilters}
        onRequestClose={() => setIsYearSheetVisible(false)}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  state: { marginTop: 32 },
  error: {
    marginTop: 48,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
  },
  tabs: {
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    ...smallButtonShadow,
  },
  squareButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...smallButtonShadow,
  },
});
