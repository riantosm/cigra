import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Badge from '@/components/atoms/Badge';
import type { BadgeVariant } from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';

export interface AssetCardProps {
  icon: IconName;
  // Judul kategori aset, mis. "Senjata Dinas".
  category: string;
  count: number;
  // Nama aset menonjol, mis. "SS2-V1" / "Toyota Hilux Double Cabin".
  name: string;
  lines: { label: string; value: string }[];
  badgeLabel: string;
  badgeVariant: BadgeVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Kartu ringkas satu aset milik anggota di bagian "Aset Saya" (senjata dinas / kendaraan).
export default function AssetCard(props: AssetCardProps) {
  const { icon, category, count, name, lines, badgeLabel, badgeVariant, onPress, style } = props;

  return (
    <PressableScale scaleTo={0.97} onPress={onPress} disabled={!onPress} style={style} contentStyle={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name={icon} size={15} color={colors.primary} />
          <Text style={styles.category} numberOfLines={1}>
            {category}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{count}</Text>
          </View>
          <Icon name="chevron-right" size={14} color={colors.placeholder} />
        </View>
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>

      <View style={styles.lines}>
        {lines.map(line => (
          <Text key={line.label} style={styles.line} numberOfLines={1}>
            <Text style={styles.lineLabel}>{line.label}: </Text>
            {line.value}
          </Text>
        ))}
      </View>

      <Badge label={badgeLabel} variant={badgeVariant} style={styles.badge} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  category: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  countPill: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  lines: {
    gap: 2,
  },
  line: {
    fontSize: 11,
    color: colors.text,
  },
  lineLabel: {
    color: colors.textMuted,
  },
  badge: {
    marginTop: 2,
  },
});
