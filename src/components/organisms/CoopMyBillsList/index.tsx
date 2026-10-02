import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import CoopCategoryBreakdown from '@/components/molecules/CoopCategoryBreakdown';
import CoopDeltaPill from '@/components/molecules/CoopDeltaPill';
import CoopPeriodRow from '@/components/molecules/CoopPeriodRow';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import TrendBarChart from '@/components/molecules/TrendBarChart';
import { colors } from '@/theme/colors';
import { cardShadowRaised } from '@/theme/shadows';
import type { CoopMyBills } from '@/types';
import {
  coopCategoryLines,
  coopCategorySummary,
  coopDeltaFromSeries,
  coopDeltaPillLabel,
  periodChipParts,
  trendBarItems,
} from '@/utils/coopSalary';

export interface CoopMyBillsListProps {
  data: CoopMyBills | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onEndReached: () => void;
  onOpenRow: (rowId: number) => void;
  // Elemen di atas kartu utama (mis. toggle Rekap Satuan / Tagihan Saya di menu pengelola).
  header?: ReactElement | null;
}

// Isi "Tagihan Saya" di menu Tagihan Koperasi (`GET /coop-salary-report/me`): kartu periode
// terbaru (nominal, selisih vs periode sebelumnya, alokasi per jenis) → grafik tren + ringkasan →
// riwayat periode. Presentational — data dari `useCoopMyBills`.
export default function CoopMyBillsList(props: CoopMyBillsListProps) {
  const { data, isLoading, isRefreshing, isLoadingMore, errorMessage, onRefresh, onEndReached, onOpenRow, header } =
    props;

  const rows = data?.rows ?? [];
  const latest = rows[0] ?? null;
  const trendValues = data?.trend.values ?? [];
  const trendLabels = data?.trend.labels ?? [];
  const delta = coopDeltaFromSeries(trendValues);
  const previousLabel = trendLabels[trendLabels.length - 2];
  const trendItems = trendBarItems(trendLabels, trendValues);
  const hasCategories = (latest?.categories ?? []).some(item => item.amount > 0);
  // Akun Persit/keluarga otomatis memakai data prajurit yang tertaut (`identity.source = persit`).
  const isPersit = data?.identity?.source === 'persit';

  return (
    <FlatList
      data={isLoading ? [] : rows}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      onEndReachedThreshold={0.4}
      onEndReached={onEndReached}
      ListHeaderComponent={
        <View>
          {header}
          {isPersit ? (
            <View style={styles.persitStrip}>
              <Icon name="users" size={16} color={colors.persitText} />
              <Text style={styles.persitText}>Menampilkan tagihan prajurit yang tertaut dengan akun Anda</Text>
            </View>
          ) : null}
          {isLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : data && latest ? (
            <>
              <PressableScale scaleTo={0.98} onPress={() => onOpenRow(latest.id)} contentStyle={styles.heroCard}>
                <View style={styles.heroBody}>
                  <View style={styles.kickerRow}>
                    <Text style={styles.kicker} numberOfLines={1}>
                      Tagihan {latest.period.label}
                    </Text>
                    <View style={styles.latestBadge}>
                      <Text style={styles.latestBadgeText}>TERBARU</Text>
                    </View>
                  </View>
                  <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
                    {latest.total_formatted}
                  </Text>
                  {delta && previousLabel ? (
                    <View style={styles.compareRow}>
                      <CoopDeltaPill trend={delta.trend} label={coopDeltaPillLabel(delta)} />
                      <Text style={styles.compareText}>vs {previousLabel}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.compareText, styles.compareSolo]}>Periode pertama yang tercatat</Text>
                  )}
                  {hasCategories ? (
                    <CoopCategoryBreakdown
                      lines={coopCategoryLines(latest.categories)}
                      variant="compact"
                      maxLegend={4}
                      style={styles.breakdown}
                    />
                  ) : null}
                </View>
                <View style={styles.heroFooter}>
                  <Text style={styles.heroLink}>Lihat rincian per jenis</Text>
                  <Icon name="chevron-right" size={16} color={colors.primary} />
                </View>
              </PressableScale>

              {trendItems.length > 1 ? (
                <Card style={styles.card}>
                  <View style={styles.cardHead}>
                    <Text style={styles.cardTitle}>Tren Tagihan</Text>
                    <Text style={styles.cardHint}>{data.summary.periods} periode</Text>
                  </View>
                  <TrendBarChart items={trendItems} />
                  <StatDividerRow
                    style={styles.trendStats}
                    items={[
                      { label: 'Total', value: data.summary.total_amount_formatted },
                      { label: 'Rata-rata', value: data.summary.average_amount_formatted },
                      { label: 'Tertinggi', value: data.summary.highest_amount_formatted },
                    ]}
                  />
                </Card>
              ) : (
                <Card style={styles.card}>
                  <StatDividerRow
                    border="none"
                    items={[
                      { label: 'Total', value: data.summary.total_amount_formatted },
                      { label: 'Rata-rata', value: data.summary.average_amount_formatted },
                      { label: 'Periode', value: String(data.summary.periods), flex: 0.7 },
                    ]}
                  />
                </Card>
              )}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Riwayat Periode</Text>
                <Text style={styles.sectionMeta}>{data.meta.total} periode</Text>
              </View>
            </>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        isLoading ? undefined : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="receipt" size={20} color={colors.placeholder} />
            </View>
            <Text style={styles.emptyTitle}>{errorMessage ? 'Gagal memuat' : 'Belum ada tagihan koperasi'}</Text>
            <Text style={styles.emptyText}>
              {errorMessage ?? 'Tagihan muncul di sini setelah rekap bulanan diunggah.'}
            </Text>
          </View>
        )
      }
      ItemSeparatorComponent={ListSeparator}
      renderItem={({ item, index }) => {
        const chip = periodChipParts(item.period.month_label, item.period.year);
        return (
          <CoopPeriodRow
            monthShort={chip.month}
            year={chip.year}
            title={item.period.label}
            subtitle={coopCategorySummary(item.categories)}
            amount={item.total_formatted}
            isLatest={index === 0}
            onPress={() => onOpenRow(item.id)}
          />
        );
      }}
      ListFooterComponent={
        isLoadingMore ? (
          <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
        ) : data && rows.length > 0 ? (
          <Text style={styles.footerText}>
            Menampilkan {rows.length} dari {data.meta.total} periode
          </Text>
        ) : undefined
      }
    />
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
  loader: {
    marginTop: 48,
  },
  persitStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.persitSurface,
    marginBottom: 14,
  },
  persitText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.persitText,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...cardShadowRaised,
  },
  heroBody: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
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
  latestBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: colors.primary,
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
  compareText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  compareSolo: {
    marginTop: -4,
  },
  breakdown: {
    marginTop: 16,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  heroLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  card: {
    marginTop: 14,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  cardHint: {
    fontSize: 11,
    color: colors.placeholder,
  },
  trendStats: {
    marginTop: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  sectionMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  separator: {
    height: 12,
  },
  empty: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralSurface,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: colors.textMuted,
  },
  footerLoader: {
    marginVertical: 18,
  },
  footerText: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 12,
    color: colors.placeholder,
  },
});
