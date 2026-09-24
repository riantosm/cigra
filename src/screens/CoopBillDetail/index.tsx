import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import CoopCategoryBreakdown from '@/components/molecules/CoopCategoryBreakdown';
import CoopDeltaPill from '@/components/molecules/CoopDeltaPill';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  getCoopReportMemberDetailApi,
  getMyCoopBillDetailApi,
  myCoopBillExportPath,
} from '@/services/api/coopSalary.service';
import { colors } from '@/theme/colors';
import { cardShadow, cardShadowRaised, tabBarShadow } from '@/theme/shadows';
import type { CoopBillDetail, CoopExportFormat } from '@/types';
import { coopCategoryLines, formatPercent, formatRupiah } from '@/utils/coopSalary';
import { exportCoopFile } from '@/utils/coopSalaryExport';
import { cleanValue, extractErrorMessage, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.coopBillDetail>;

// Deret "Perbandingan Periode" dibatasi ke 6 periode terakhir supaya tetap ringkas.
const MAX_SERIES = 6;

// Rincian tagihan satu periode. Dua mode dari satu layar (struktur response identik):
// - milik sendiri → `GET /coop-salary-report/me/{row}` + ekspor Excel/PDF;
// - pengelola (`reportId` diisi) → `GET /coop-salary-report/{report}/members/{row}`, tanpa ekspor.
export default function CoopBillDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { rowId, reportId, periodLabel } = route.params;
  const isManagerView = reportId != null;

  const [detail, setDetail] = useState<CoopBillDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState<CoopExportFormat | null>(null);
  const [modal, setModal] = useState<{ variant: 'success' | 'error'; title: string; message: string } | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);
      try {
        setDetail(
          isManagerView
            ? await getCoopReportMemberDetailApi(reportId, rowId)
            : await getMyCoopBillDetailApi(rowId),
        );
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat rincian tagihan.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isManagerView, reportId, rowId],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  async function handleExport(format: CoopExportFormat) {
    if (!detail || exporting) return;
    setExporting(format);
    try {
      const result = await exportCoopFile(
        myCoopBillExportPath(detail.id, format),
        format,
        `tagihan-koperasi-${detail.period.slug ?? detail.period.label}`,
      );
      if (result.savedToDownloads) {
        setModal({ variant: 'success', title: 'Berkas Diunduh', message: 'Berkas Excel tersimpan di folder Unduhan.' });
      }
    } catch (error) {
      setModal({ variant: 'error', title: 'Gagal Mengekspor', message: extractErrorMessage(error, 'Gagal mengekspor tagihan.') });
    } finally {
      setExporting(null);
    }
  }

  const identity = detail?.identity ?? null;
  const displayName =
    [cleanValue(identity?.rank ?? detail?.rank_name), cleanValue(identity?.full_name ?? detail?.name)]
      .filter(Boolean)
      .join(' ') || '-';
  const nrp = identity?.service_number ?? detail?.nrp ?? null;
  const isLinked = identity?.personnel_id != null;
  const avatarInitial = (cleanValue(identity?.full_name ?? detail?.name) ?? '?').charAt(0).toUpperCase();
  const lines = coopCategoryLines(detail?.categories);
  const comparison = detail?.comparison ?? null;
  const previous = detail?.previous_period ?? null;
  const showFooter = !isManagerView && !!detail;

  const seriesLabels = detail?.series?.labels ?? [];
  const seriesValues = detail?.series?.values ?? [];
  const seriesStart = Math.max(seriesLabels.length - MAX_SERIES, 0);
  const series = seriesLabels.slice(seriesStart).map((label, index) => ({
    label,
    value: seriesValues[seriesStart + index] ?? 0,
  }));
  const seriesMax = Math.max(...series.map(item => item.value), 0);

  return (
    <MainLayout
      title={isManagerView ? 'Rincian Anggota' : 'Rincian Tagihan'}
      subtitle={detail?.period.label ?? periodLabel}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : !detail ? (
        <Text style={styles.error}>{errorMessage ?? 'Rincian tagihan tidak ditemukan.'}</Text>
      ) : (
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={[styles.content, showFooter && styles.contentWithFooter]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
            }>
            <View style={styles.heroCard}>
              <View style={styles.identityRow}>
                {isManagerView && !isLinked ? (
                  // Sama dengan baris "belum tertaut" di Detail Rekap: avatar abu, bukan gradient.
                  <View style={styles.plainAvatar}>
                    <Text style={styles.plainAvatarText}>{avatarInitial}</Text>
                  </View>
                ) : (
                  <GradientAvatar
                    label={avatarInitial}
                    gradientStart={colors.gradientPrimaryStart}
                    gradientEnd={colors.gradientPrimaryEnd}
                    size={44}
                  />
                )}
                <View style={styles.identityBody}>
                  <Text style={styles.identityName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.identityMeta} numberOfLines={1}>
                    {joinFields(nrp ? `NRP ${nrp}` : undefined, identity?.unit) || '-'}
                  </Text>
                </View>
                {isManagerView ? (
                  <Badge label={isLinked ? 'TERTAUT' : 'BELUM TERTAUT'} variant={isLinked ? 'success' : 'warning'} />
                ) : null}
              </View>
              <Text style={styles.kicker}>Total Tagihan</Text>
              <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
                {detail.total_formatted}
              </Text>
              {comparison && previous ? (
                <View style={styles.compareRow}>
                  <CoopDeltaPill
                    trend={comparison.trend}
                    label={
                      comparison.trend === 'flat'
                        ? 'Tetap'
                        : `${comparison.delta_formatted} · ${comparison.delta_percent < 0 ? '-' : '+'}${formatPercent(comparison.delta_percent)}`
                    }
                  />
                  <Text style={styles.compareText}>
                    vs {previous.label} ({previous.total_formatted})
                  </Text>
                </View>
              ) : (
                <Text style={styles.compareText}>Periode pertama yang tercatat</Text>
              )}
            </View>

            <Card style={styles.card}>
              <View style={styles.kickerRow}>
                <Icon name="receipt" size={18} color={colors.primary} />
                <Text style={styles.sectionKicker}>Alokasi per Jenis</Text>
              </View>
              <CoopCategoryBreakdown lines={lines} variant="full" totalLabel={detail.total_formatted} />
            </Card>

            {series.length > 1 ? (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Perbandingan Periode</Text>
                <View style={styles.seriesList}>
                  {series.map(item => {
                    const isCurrent = item.label === detail.period.label;
                    const width = seriesMax > 0 ? Math.max((item.value / seriesMax) * 100, 2) : 2;
                    return (
                      <View key={item.label} style={styles.seriesItem}>
                        <View style={styles.seriesHead}>
                          <Text style={[styles.seriesLabel, isCurrent && styles.seriesLabelCurrent]}>
                            {isCurrent ? `${item.label} · periode ini` : item.label}
                          </Text>
                          <Text style={[styles.seriesValue, isCurrent && styles.seriesValueCurrent]}>
                            {isCurrent ? detail.total_formatted : formatRupiah(item.value)}
                          </Text>
                        </View>
                        <View style={styles.seriesTrack}>
                          <View
                            style={[
                              styles.seriesFill,
                              isCurrent ? styles.seriesFillCurrent : styles.seriesFillPast,
                              { width: `${width}%` },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            ) : null}

            {detail.history.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Periode Lainnya</Text>
                <View style={styles.historyList}>
                  {detail.history.map(item => (
                    <PressableScale
                      key={item.row_id}
                      scaleTo={0.98}
                      disabled={isManagerView}
                      onPress={() => navigation.push(ROUTES.coopBillDetail, { rowId: item.row_id, periodLabel: item.period_label })}
                      contentStyle={styles.historyRow}>
                      <View style={styles.historyIcon}>
                        <Icon name="calendar" size={18} color={colors.textMuted} />
                      </View>
                      <Text style={styles.historyLabel} numberOfLines={1}>
                        {item.period_label}
                      </Text>
                      <Text style={styles.historyAmount}>{item.total_formatted}</Text>
                      {isManagerView ? null : <Icon name="chevron-right" size={18} color={colors.placeholder} />}
                    </PressableScale>
                  ))}
                </View>
              </>
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
                    <Text style={styles.secondaryButtonText}>Unduh Excel</Text>
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
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  plainAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralSurface,
  },
  plainAvatarText: { fontSize: 18, fontWeight: '700', color: colors.textMuted },
  identityBody: { flex: 1, minWidth: 0, gap: 2 },
  identityName: { fontSize: 15, fontWeight: '700', color: colors.heading },
  identityMeta: { fontSize: 12, color: colors.textMuted },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: 6,
  },
  total: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.heading,
    marginBottom: 10,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  compareText: { fontSize: 12, color: colors.textMuted },
  card: { marginBottom: 14 },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionKicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.heading, marginBottom: 14 },
  seriesList: { gap: 12 },
  seriesItem: { gap: 6 },
  seriesHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  seriesLabel: { fontSize: 12, color: colors.textMuted },
  seriesLabelCurrent: { fontWeight: '700', color: colors.heading },
  seriesValue: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  seriesValueCurrent: { fontWeight: '700', color: colors.primary },
  seriesTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.neutralSurface,
    overflow: 'hidden',
  },
  seriesFill: { height: '100%', borderRadius: 999 },
  seriesFillPast: { backgroundColor: colors.notifUnreadBorder },
  seriesFillCurrent: { backgroundColor: colors.primary },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
    marginTop: 8,
    marginBottom: 12,
  },
  historyList: { gap: 12 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralSurface,
  },
  historyLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.heading },
  historyAmount: { fontSize: 14, fontWeight: '700', color: colors.heading },
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
