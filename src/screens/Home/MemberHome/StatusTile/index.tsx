import { StyleSheet, Text, View } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import { gradientForColor } from '@/utils/gradientColor';

export interface StatusTileProps {
  icon: IconName;
  color: string;
  label: string;
  value: string;
  sub: string;
}

// Satu tile di baris "Status Saya" (Status Saat Ini / Tugas-Dinas / Lokasi Terakhir / Update
// Terakhir). Dipakai dalam ScrollView horizontal — lebarnya tetap.
export default function StatusTile(props: StatusTileProps) {
  const { icon, color, label, value, sub } = props;

  return (
    <View style={styles.tile}>
      <GradientIconChip icon={icon} colors={gradientForColor(color)} size={30} iconSize={15} radius={10} style={styles.iconWrap} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.sub} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 132,
    gap: 3,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  iconWrap: {
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  sub: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
