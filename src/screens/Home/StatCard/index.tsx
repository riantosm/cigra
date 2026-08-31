import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';

export interface StatCardProps {
  icon: IconName;
  label: string;
  value: string;
  meta: string;
  color: string;
  metaColor?: string;
  // Kalau ada, dipakai buat progress bar di bawah (0-100). Kalau tidak ada, bar-nya tidak
  // dirender sama sekali.
  percent?: number;
}

// Kartu statistik canvas (DESIGN_SYSTEM.md §5.13): baris [ikon + label] di atas, lalu angka
// besar, persen kecil, progress bar tipis.
export default function StatCard(props: StatCardProps) {
  const { icon, label, value, meta, color, metaColor, percent } = props;

  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        <Icon name={icon} size={16} color={color} />
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={[styles.meta, metaColor ? { color: metaColor } : null]}>{meta}</Text>
      {percent !== undefined ? (
        <View style={styles.track}>
          <View style={[styles.fill, { backgroundColor: color, width: `${Math.min(100, percent)}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.heading,
  },
  meta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.chipSurface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
