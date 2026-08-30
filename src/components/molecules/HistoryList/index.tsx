import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import type { BadgeVariant } from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import Card from '@/components/molecules/Card';
import { colors } from '@/theme/colors';

export interface HistoryRow {
  icon: IconName;
  label: string;
  value: string;
}

// Peta status → warna badge yang dipakai bersama daftar "Riwayat visitor" / "Peminjaman Senjata".
export function historyStatusVariant(status: string | null | undefined): BadgeVariant {
  switch (status) {
    case 'approved':
    case 'returned':
    case 'active':
    case 'inside':
      return 'success';
    case 'pending':
      return 'primary';
    default:
      return 'neutral';
  }
}

export interface HistoryCardProps {
  rows: HistoryRow[];
  statusLabel?: string;
  statusVariant?: BadgeVariant;
}

export function HistoryCard(props: HistoryCardProps) {
  const { rows, statusLabel, statusVariant } = props;

  return (
    <Card style={styles.card}>
      {statusLabel ? (
        <Badge label={statusLabel} variant={statusVariant ?? 'neutral'} style={styles.badge} />
      ) : null}
      {rows.map(row => (
        <View key={row.label} style={styles.row}>
          <View style={styles.iconCircle}>
            <Icon name={row.icon} size={13} color={colors.primary} />
          </View>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{`: ${row.value}`}</Text>
        </View>
      ))}
    </Card>
  );
}

export interface HistoryListProps<T> {
  // Judul pill gelap di atas daftar (mis. "Catatan Keluar Masuk").
  title: string;
  entries: T[];
  emptyLabel: string;
  renderCard: (entry: T) => ReactNode;
}

// Daftar kartu riwayat dengan header pill gelap + empty state — dipakai di detail Personel & Persit
// (tab "Riwayat visitor", "Peminjaman Senjata"). Bentuk tiap kartu ditentukan `renderCard`.
export default function HistoryList<T>(props: HistoryListProps<T>) {
  const { title, entries, emptyLabel, renderCard } = props;

  return (
    <>
      <View style={styles.headerBar}>
        <Text style={styles.headerText}>{title}</Text>
      </View>
      {entries.length === 0 ? (
        <Text style={styles.empty}>{emptyLabel}</Text>
      ) : (
        <View style={styles.list}>{entries.map(entry => renderCard(entry))}</View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: colors.text,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 8,
  },
  list: {
    gap: 12,
  },
  card: {
    gap: 2,
  },
  badge: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  iconCircle: {
    height: 24,
    width: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    minWidth: 72,
  },
  value: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
});
