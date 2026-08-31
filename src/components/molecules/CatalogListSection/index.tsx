import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import { colors } from '@/theme/colors';

export interface CatalogListSectionItem {
  title: string;
  subtitle: string;
  // Kalau diisi, baris jadi bisa ditekan (mis. anggota keluarga -> detail Persit) dan menampilkan
  // chevron di kanan sebagai penanda.
  onPress?: () => void;
}

export interface CatalogListSectionProps {
  icon: IconName;
  title: string;
  items: CatalogListSectionItem[];
  emptyLabel?: string;
}

export default function CatalogListSection(props: CatalogListSectionProps) {
  const { icon, title, items, emptyLabel = 'Belum ada data.' } = props;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Icon name={icon} size={18} color={colors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {items.length === 0 ? (
        <Text style={styles.empty}>{emptyLabel}</Text>
      ) : (
        items.map((item, index) => {
          const isLast = index === items.length - 1;
          const inner = (
            <>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
              </View>
              {item.onPress ? (
                <Icon name="chevron-right" size={18} color={colors.textMuted} />
              ) : null}
            </>
          );

          return item.onPress ? (
            <PressableScale
              key={`${item.title}-${index}`}
              onPress={item.onPress}
              style={[styles.row, isLast && styles.lastRow]}
              contentStyle={styles.rowInner}>
              {inner}
            </PressableScale>
          ) : (
            <View key={`${item.title}-${index}`} style={[styles.row, styles.rowInner, isLast && styles.lastRow]}>
              {inner}
            </View>
          );
        })
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 4,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
