import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  style?: StyleProp<ViewStyle>;
}

// Placeholder "belum ada konten" terpusat untuk layar tab yang isinya menyusul (Buku Saku,
// Lainnya, Riwayat non-anggota) — icon-chip `chipSurface` + judul + pesan (DESIGN_SYSTEM §4/§7).
export default function EmptyState(props: EmptyStateProps) {
  const { icon, title, message, style } = props;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconChip}>
        <Icon name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  iconChip: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.chipSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.heading,
  },
  message: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
