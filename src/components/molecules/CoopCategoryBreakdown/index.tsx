import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import type { CoopCategoryLine } from '@/utils/coopSalary';
import { formatPercent, formatRupiah } from '@/utils/coopSalary';

export interface CoopCategoryBreakdownProps {
  lines: CoopCategoryLine[];
  // `compact` (kartu Home): bar tipis + legenda jenis yang bernilai saja.
  // `full` (layar rincian): bar + SEMUA jenis (yang nol dipudarkan) + persen + baris "Jumlah".
  variant?: 'compact' | 'full';
  totalLabel?: string;
  // `compact` saja: jumlah jenis terbesar yang ditampilkan di legenda; sisanya digabung jadi satu
  // baris "N jenis lainnya". Default semua.
  maxLegend?: number;
  style?: StyleProp<ViewStyle>;
}

// Alokasi tagihan per jenis: bar bertumpuk (warna per jenis, `coopCategory*` token) + legenda.
export default function CoopCategoryBreakdown(props: CoopCategoryBreakdownProps) {
  const { lines, variant = 'full', totalLabel, maxLegend, style } = props;
  const nonZero = lines.filter(line => line.amount > 0);
  const isCompact = variant === 'compact';
  // Legenda compact diurut terbesar dulu (bar tetap urutan kanonik supaya warnanya stabil).
  const compactSorted = [...nonZero].sort((a, b) => b.amount - a.amount);
  const compactShown = maxLegend != null ? compactSorted.slice(0, maxLegend) : compactSorted;
  const compactRest = compactSorted.slice(compactShown.length);
  const rows = isCompact ? compactShown : lines;

  return (
    <View style={style}>
      <View style={[styles.bar, isCompact ? styles.barCompact : styles.barFull]}>
        {nonZero.length === 0 ? (
          <View style={[styles.segment, styles.segmentEmpty]} />
        ) : (
          nonZero.map(line => (
            <View key={line.key} style={[styles.segment, { flex: line.percent, backgroundColor: line.color }]} />
          ))
        )}
      </View>

      {rows.map((line, index) => {
        const isZero = line.amount <= 0;
        if (isCompact) {
          return (
            <View key={line.key} style={styles.compactRow}>
              <View style={[styles.compactDot, { backgroundColor: line.color }]} />
              <Text style={styles.compactLabel} numberOfLines={1}>
                {line.label}
              </Text>
              <Text style={styles.compactAmount}>{line.amountLabel}</Text>
            </View>
          );
        }
        return (
          <View key={line.key} style={[styles.fullRow, index < rows.length - 1 || totalLabel ? styles.fullRowDivider : null]}>
            <View style={[styles.fullSwatch, { backgroundColor: isZero ? colors.border : line.color }]} />
            <Text style={[styles.fullLabel, isZero && styles.muted]} numberOfLines={1}>
              {line.label}
            </Text>
            <Text style={[styles.fullPercent, isZero && styles.faint]}>
              {isZero ? '–' : formatPercent(line.percent)}
            </Text>
            <Text style={[styles.fullAmount, isZero && styles.fullAmountZero]} numberOfLines={1} adjustsFontSizeToFit>
              {line.amountLabel}
            </Text>
          </View>
        );
      })}

      {isCompact && compactRest.length > 0 ? (
        <View style={styles.compactRow}>
          <View style={[styles.compactDot, styles.compactDotRest]} />
          <Text style={[styles.compactLabel, styles.compactRestLabel]} numberOfLines={1}>
            {compactRest.length} jenis lainnya
          </Text>
          <Text style={styles.compactAmount}>
            {formatRupiah(compactRest.reduce((sum, line) => sum + line.amount, 0))}
          </Text>
        </View>
      ) : null}

      {!isCompact && totalLabel ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Jumlah</Text>
          <Text style={styles.totalValue}>{totalLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barCompact: {
    height: 8,
    marginBottom: 10,
  },
  barFull: {
    height: 10,
    marginBottom: 6,
  },
  segment: {
    height: '100%',
  },
  segmentEmpty: {
    flex: 1,
    backgroundColor: colors.neutralSurface,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.textBody,
  },
  compactDotRest: {
    backgroundColor: colors.border,
  },
  compactRestLabel: {
    color: colors.textMuted,
  },
  compactAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.heading,
  },
  fullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  fullRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  fullSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  fullLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.textBody,
  },
  fullPercent: {
    width: 48,
    textAlign: 'right',
    fontSize: 12,
    color: colors.textMuted,
  },
  fullAmount: {
    width: 112,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: colors.heading,
  },
  fullAmountZero: {
    fontWeight: '400',
    color: colors.placeholder,
  },
  muted: {
    color: colors.placeholder,
  },
  faint: {
    color: colors.textFaint,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.heading,
  },
});
