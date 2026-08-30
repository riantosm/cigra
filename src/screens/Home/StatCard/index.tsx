import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

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

export default function StatCard(props: StatCardProps) {
  const { icon, label, value, meta, color, metaColor, percent } = props;

  return (
    <View style={styles.card}>
      <Icon name={icon} size={16} color={color} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
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
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutralSurface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
