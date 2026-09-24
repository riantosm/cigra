import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';

export interface StatDividerItem {
  label: string;
  value: string;
  // Warna angka (default `heading`) — mis. amber untuk "Belum tertaut".
  valueColor?: string;
  // Bobot lebar kolom (default 1) — kolom berisi nominal rupiah panjang butuh lebih lebar.
  flex?: number;
}

export interface StatDividerRowProps {
  items: StatDividerItem[];
  // `top` = garis atas (baris penutup kartu); `both` = garis atas & bawah (baris di tengah kartu).
  border?: 'top' | 'both';
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

// Baris mini-stat dengan garis vertikal `borderSoft` antar kolom (pola yang sama dengan baris
// bawah SituationHeroCard — DESIGN_SYSTEM §5.13b), rata kiri: label kecil di atas, angka di bawah.
export default function StatDividerRow(props: StatDividerRowProps) {
  const { items, border = 'top', size = 'sm', style } = props;

  return (
    <View style={[styles.row, border === 'both' && styles.rowBoth, style]}>
      {items.map((item, index) => (
        <View
          key={item.label}
          style={[styles.cell, { flex: item.flex ?? 1 }, index > 0 && styles.cellDivided]}>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          <Text
            style={[styles.value, size === 'md' && styles.valueMd, item.valueColor ? { color: item.valueColor } : null]}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  rowBoth: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  cell: {
    flexBasis: 0,
    minWidth: 0,
    gap: 2,
  },
  cellDivided: {
    paddingLeft: 12,
    marginLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderSoft,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.heading,
  },
  valueMd: {
    fontSize: 15,
  },
});
