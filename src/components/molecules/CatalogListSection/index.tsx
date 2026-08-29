import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import Card from '@/components/molecules/Card';
import { colors } from '@/theme/colors';

export interface CatalogListSectionItem {
  title: string;
  subtitle: string;
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
        items.map((item, index) => (
          <View key={`${item.title}-${index}`} style={[styles.row, index === items.length - 1 && styles.lastRow]}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
          </View>
        ))
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
    borderBottomColor: colors.border,
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
