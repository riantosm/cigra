import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import Card from '@/components/molecules/Card';
import CoopPeriodRow from '@/components/molecules/CoopPeriodRow';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import TrendBarChart from '@/components/molecules/TrendBarChart';
import { colors } from '@/theme/colors';
import { cardShadowRaised } from '@/theme/shadows';
import type { CoopMyBills } from '@/types';
import { coopCategorySummary, periodChipParts, trendBarItems } from '@/utils/coopSalary';
import { cleanValue } from '@/utils/format';

export interface CoopMyBillsListProps {
  data: CoopMyBills | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onEndReached: () => void;
  onOpenRow: (rowId: number) => void;
  // Elemen di atas ringkasan (mis. segmented control di layar Rekap Satuan).
  header?: ReactElement | null;
}

// Isi daftar "Tagihan Saya" (`GET /coop-salary-report/me`): kartu total seluruh periode, grafik
// tren, lalu kartu per periode (terbaru lebih dulu). Presentational — data dari `useCoopMyBills`.
export default function CoopMyBillsList(props: CoopMyBillsListProps) {
  const { data, isLoading, isRefreshing, isLoadingMore, errorMessage, onRefresh, onEndReached, onOpenRow, header } =
    props;

  const rows = data?.rows ?? [];
  // `identity.rank` sering null dari backend — pangkat diambil dari `rank_name` baris tagihan.
  const identityName = data?.identity
    ? [cleanValue(data.identity.rank ?? rows[0]?.rank_name), cleanValue(data.identity.full_name)]
        .filter(Boolean)
        .join(' ')
    : '';
  const latestTotal = data?.summary.latest?.total_formatted ?? rows[0]?.total_formatted ?? '-';
  const trendItems = trendBarItems(data?.trend.labels, data?.trend.values);

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
          {isLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : data && (data.summary.periods > 0 || rows.length > 0) ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.kickerRow}>
                  <Icon name="wallet" size={16} color={colors.primary} />
                  <Text style={styles.kicker}>Total Seluruh Periode</Text>
                </View>
                <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
                  {data.summary.total_amount_formatted}
                </Text>
                <Text style={styles.totalMeta}>
                  {[identityName, `${data.summary.periods} periode tercatat`].filter(Boolean).join(' · ')}
                </Text>
                <StatDividerRow
                  items={[
                    { label: 'Terbaru', value: latestTotal },
                    { label: 'Rata-rata', value: data.summary.average_amount_formatted },
                    { label: 'Tertinggi', value: data.summary.highest_amount_formatted },
                  ]}
                />
              </View>

              {trendItems.length > 0 ? (
                <Card style={styles.trendCard}>
                  <View style={styles.trendHead}>
                    <Text style={styles.cardTitle}>Tren Tagihan</Text>
                    <Text style={styles.trendHint}>per periode</Text>
                  </View>
                  <TrendBarChart items={trendItems} />
                </Card>
              ) : null}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Daftar Periode</Text>
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
              {errorMessage ?? 'Tagihan muncul di sini setelah pengelola koperasi mengunggah rekap bulanan.'}
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
  summaryCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    marginBottom: 14,
    ...cardShadowRaised,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
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
  totalMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  trendCard: {
    marginBottom: 8,
  },
  trendHead: {
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
  trendHint: {
    fontSize: 11,
    color: colors.placeholder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
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
