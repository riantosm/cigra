import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';

export interface CoopPeriodRowProps {
  // Chip tanggal kiri: "SEP" / "2026".
  monthShort: string;
  year: string;
  title: string;
  subtitle?: string | null;
  amount: string;
  isLatest?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Kartu satu periode tagihan (daftar "Tagihan Saya"): chip tanggal + periode (+ "TERBARU") +
// jenis tagihan yang bernilai + nominal + chevron.
export default function CoopPeriodRow(props: CoopPeriodRowProps) {
  const { monthShort, year, title, subtitle, amount, isLatest, onPress, style } = props;

  return (
    <PressableScale scaleTo={0.98} onPress={onPress} disabled={!onPress} style={style} contentStyle={styles.card}>
      <View style={[styles.dateChip, isLatest ? styles.dateChipLatest : styles.dateChipPast]}>
        <Text style={[styles.dateMonth, isLatest ? styles.dateMonthLatest : null]}>{monthShort}</Text>
        <Text style={styles.dateYear}>{year}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {isLatest ? (
            <View style={styles.latestBadge}>
              <Text style={styles.latestBadgeText}>TERBARU</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={styles.amount}>{amount}</Text>
      {onPress ? <Icon name="chevron-right" size={18} color={colors.placeholder} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
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
  dateChip: {
    width: 48,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipLatest: {
    backgroundColor: colors.chipSurface,
  },
  dateChipPast: {
    backgroundColor: colors.neutralSurface,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  dateMonthLatest: {
    color: colors.primary,
  },
  dateYear: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.heading,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  latestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primarySurface,
  },
  latestBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
});
