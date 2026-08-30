import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export interface DistributionItemProps {
  icon: IconName;
  label: string;
  value: number;
  percent: number;
  color: string;
  // Kolom terakhir tidak dapat garis pembatas kanan.
  showDivider?: boolean;
}

export default function DistributionItem(props: DistributionItemProps) {
  const { icon, label, value, percent, color, showDivider } = props;

  return (
    <View style={[styles.container, showDivider && styles.containerDivider]}>
      <Icon name={icon} size={20} color={color} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.percent, { color }]}>{percent}%</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { backgroundColor: color, width: `${Math.min(100, percent)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 92,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  containerDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
  },
  percent: {
    fontSize: 11,
    fontWeight: '600',
  },
  track: {
    marginTop: 2,
    width: '100%',
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
