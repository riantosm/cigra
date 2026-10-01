import { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import CoopCategoryBreakdown from '@/components/molecules/CoopCategoryBreakdown';
import CoopDeltaPill from '@/components/molecules/CoopDeltaPill';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { CoopPersonnelTagihan } from '@/types';
import {
  coopCategoryLines,
  coopDeltaFromSeries,
  coopDeltaSentence,
  formatPercent,
  normalizePersonnelCoopPeriods,
} from '@/utils/coopSalary';

export interface PersonnelCoopTabProps {
  // `tagihan_koperasi` dari `GET /catalog/personnel/{id}` (tab disembunyikan bila null).
  data: CoopPersonnelTagihan;
}

// Tab "Koperasi" di detail personel: ringkasan tagihan (periode terbaru + selisih + total /
// rata-rata / jumlah periode) lalu rincian per bulan — tiap bulan bisa dibuka untuk melihat tujuh
// jenis tagihannya (yang terbaru terbuka otomatis).
function PersonnelCoopTab(props: PersonnelCoopTabProps) {
  const { data } = props;
  const periods = useMemo(
    () => normalizePersonnelCoopPeriods(data.periods, data.categories),
    [data.periods, data.categories],
  );
  const [openKeys, setOpenKeys] = useState<string[]>(() => (periods[0] ? [periods[0].key] : []));

  const latest = periods[0] ?? null;
  // Deret untuk selisih: urutan lama → baru (periods terbaru dulu).
  const delta = coopDeltaFromSeries(periods.slice(0, 2).reverse().map(period => period.total));
  const previousLabel = periods[1]?.label;

  function toggle(key: string) {
    setOpenKeys(keys => (keys.includes(key) ? keys.filter(item => item !== key) : [...keys, key]));
  }

  if (!latest) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <View style={styles.emptyIcon}>
          <Icon name="receipt" size={20} color={colors.placeholder} />
        </View>
        <View style={styles.emptyBody}>
          <Text style={styles.emptyTitle}>Belum ada tagihan koperasi</Text>
          <Text style={styles.emptyText}>Tagihan personel ini muncul setelah rekap bulanan diunggah.</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.kicker} numberOfLines={1}>
          Tagihan Terbaru · {latest.label}
        </Text>
        <View style={styles.amountRow}>
          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            {latest.totalLabel}
          </Text>
          {delta && delta.trend !== 'flat' ? (
            <CoopDeltaPill trend={delta.trend} label={formatPercent(delta.percent)} style={styles.pill} />
          ) : null}
        </View>
        <Text style={styles.deltaText}>{coopDeltaSentence(delta, previousLabel)}</Text>
        <StatDividerRow
          items={[
            { label: 'Total', value: data.summary.total_amount_formatted },
            { label: 'Rata-rata', value: data.summary.average_amount_formatted },
            { label: 'Periode', value: String(data.summary.periods || periods.length), flex: 0.7 },
          ]}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Rincian per Bulan</Text>
        <Text style={styles.sectionMeta}>{periods.length} periode</Text>
      </View>

      <View style={styles.list}>
        {periods.map((period, index) => {
          const isOpen = openKeys.includes(period.key);
          const filled = period.categories.filter(item => item.amount > 0).length;
          return (
            <View key={period.key} style={styles.accordion}>
              <PressableScale
                scaleTo={0.98}
                onPress={() => toggle(period.key)}
                accessibilityState={{ expanded: isOpen }}
                contentStyle={styles.accordionHead}>
                <View style={[styles.dateChip, index === 0 ? styles.dateChipLatest : styles.dateChipPast]}>
                  <Text style={[styles.dateMonth, index === 0 && styles.dateMonthLatest]}>{period.monthShort}</Text>
                  <Text style={styles.dateYear}>{period.year}</Text>
                </View>
                <View style={styles.accordionBody}>
                  <Text style={styles.periodTitle} numberOfLines={1}>
                    {period.label}
                  </Text>
                  <Text style={styles.periodMeta}>
                    {filled} dari {data.categories.length || period.categories.length} jenis
                  </Text>
                </View>
                <Text style={styles.periodAmount}>{period.totalLabel}</Text>
                <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.placeholder} />
              </PressableScale>
              {isOpen ? (
                <View style={styles.accordionContent}>
                  <CoopCategoryBreakdown lines={coopCategoryLines(period.categories, data.categories)} variant="full" />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default memo(PersonnelCoopTab);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    marginTop: 16,
    ...cardShadow,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: 6,
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
  pill: { alignSelf: 'auto', marginBottom: 4 },
  deltaText: { fontSize: 12, color: colors.textMuted, marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  sectionMeta: { fontSize: 12, color: colors.textMuted },
  list: { gap: 12 },
  accordion: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...cardShadow,
  },
  accordionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateChip: {
    width: 48,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipLatest: { backgroundColor: colors.chipSurface },
  dateChipPast: { backgroundColor: colors.neutralSurface },
  dateMonth: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: colors.textMuted },
  dateMonthLatest: { color: colors.primary },
  dateYear: { fontSize: 13, fontWeight: '800', color: colors.heading },
  accordionBody: { flex: 1, minWidth: 0, gap: 3 },
  periodTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  periodMeta: { fontSize: 12, color: colors.textMuted },
  periodAmount: { fontSize: 14, fontWeight: '700', color: colors.heading },
  accordionContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralSurface,
  },
  emptyBody: { flex: 1, gap: 2 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.heading },
  emptyText: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
});
