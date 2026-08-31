import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';

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
      <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
        <Icon name={icon} size={15} color={color} />
      </View>
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
    height: 30,
    width: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
