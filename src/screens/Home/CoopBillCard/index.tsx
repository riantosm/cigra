import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import CoopCategoryBreakdown from '@/components/molecules/CoopCategoryBreakdown';
import CoopDeltaPill from '@/components/molecules/CoopDeltaPill';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { CoopMyBills } from '@/types';
import {
  COOP_TREND_META,
  coopCategoryLines,
  coopDeltaFromSeries,
  formatPercent,
  formatRupiah,
} from '@/utils/coopSalary';

export interface CoopBillCardProps {
  // Hasil `GET /coop-salary-report/me?per_page=1` — `rows[0]` = periode terbaru (+ categories).
  data: CoopMyBills;
  onPress: (rowId: number) => void;
  style?: StyleProp<ViewStyle>;
}

// Kartu "Tagihan Saya" di Home (MemberHome di bawah "Aset Saya"; CommanderHome kalau komandan
// ber-mode member). Total periode terbaru + naik/turun vs periode sebelumnya (dari 2 nilai terakhir
// `trend.values`) + alokasi per jenis + rata-rata/tertinggi/jumlah periode.
export default function CoopBillCard(props: CoopBillCardProps) {
  const { data, onPress, style } = props;
  const latest = data.rows[0];

  if (!latest) {
    return (
      <View style={[styles.card, styles.emptyCard, style]}>
        <View style={styles.emptyIcon}>
          <Icon name="receipt" size={20} color={colors.placeholder} />
        </View>
        <View style={styles.emptyBody}>
          <Text style={styles.emptyTitle}>Belum ada tagihan koperasi</Text>
          <Text style={styles.emptyText}>
            Tagihan muncul di sini setelah pengelola koperasi mengunggah rekap bulanan.
          </Text>
        </View>
      </View>
    );
  }

  const delta = coopDeltaFromSeries(data.trend?.values);
  const previousLabel = data.trend?.labels?.[data.trend.labels.length - 2];
  const lines = coopCategoryLines(latest.categories);
  const hasCategories = (latest.categories ?? []).some(item => item.amount > 0);

  let deltaText = 'Periode pertama yang tercatat';
  if (delta && previousLabel) {
    deltaText =
      delta.trend === 'flat'
        ? `Sama dengan ${previousLabel}`
        : `${COOP_TREND_META[delta.trend].verb} ${formatRupiah(Math.abs(delta.delta))} dari ${previousLabel}`;
  }

  return (
    <PressableScale scaleTo={0.98} onPress={() => onPress(latest.id)} style={style} contentStyle={styles.card}>
      <View style={styles.header}>
        <GradientIconChip icon="wallet" colors={[colors.gradientSuccessStart, colors.success]} size={36} iconSize={18} radius={11} />
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Koperasi · {latest.period.label}
          </Text>
          <Text style={styles.headerSub}>Tagihan periode terbaru</Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.placeholder} />
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
          {latest.total_formatted}
        </Text>
        {delta && delta.trend !== 'flat' ? (
          <CoopDeltaPill trend={delta.trend} label={formatPercent(delta.percent)} style={styles.pill} />
        ) : null}
      </View>
      <Text style={styles.deltaText}>{deltaText}</Text>

      {hasCategories ? <CoopCategoryBreakdown lines={lines} variant="compact" maxLegend={3} style={styles.breakdown} /> : null}

      <StatDividerRow
        items={[
          { label: 'Rata-rata', value: data.summary.average_amount_formatted },
          { label: 'Tertinggi', value: data.summary.highest_amount_formatted },
          { label: 'Periode', value: String(data.summary.periods), flex: 0.7 },
        ]}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  headerBody: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.heading,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  amount: {
    flexShrink: 1,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.heading,
  },
  pill: {
    alignSelf: 'auto',
    marginBottom: 4,
  },
  deltaText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 14,
  },
  breakdown: {
    marginBottom: 8,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralSurface,
  },
  emptyBody: {
    flex: 1,
    gap: 2,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
});
