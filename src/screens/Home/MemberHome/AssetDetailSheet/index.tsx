import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import type { BadgeVariant } from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import InfoRow from '@/components/molecules/InfoRow';
import BottomSheet from '@/components/organisms/BottomSheet';
import { colors } from '@/theme/colors';

// Satu aset (senjata / kendaraan) yang ditampilkan penuh di sheet detail. Semua nilai berasal
// dari item list `GET /me/assets` yang sudah dimuat — sheet ini tidak melakukan fetch apa pun.
export interface AssetDetailGroup {
  name: string;
  badgeLabel?: string;
  badgeVariant?: BadgeVariant;
  rows: { icon: IconName; label: string; value: string }[];
}

export interface AssetDetailSheetData {
  icon: IconName;
  title: string;
  groups: AssetDetailGroup[];
}

export interface AssetDetailSheetProps {
  data: AssetDetailSheetData | null;
  onClose: () => void;
}

// Bottom sheet detail "Aset Saya" — dibuka saat kartu senjata/kendaraan di MemberHome di-tap.
export default function AssetDetailSheet(props: AssetDetailSheetProps) {
  const { data, onClose } = props;

  return (
    <BottomSheet visible={data !== null} onRequestClose={onClose}>
      {data ? (
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View style={styles.headIcon}>
              <Icon name={data.icon} size={16} color={colors.primary} />
            </View>
            <Text style={styles.title}>{data.title}</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {data.groups.map((group, index) => (
              <View
                key={`${group.name}-${index}`}
                style={[styles.group, index > 0 && styles.groupSpaced]}>
                <View style={styles.groupHead}>
                  <Text style={styles.groupName} numberOfLines={2}>
                    {group.name}
                  </Text>
                  {group.badgeLabel ? (
                    <Badge label={group.badgeLabel} variant={group.badgeVariant} />
                  ) : null}
                </View>
                <View style={styles.groupRows}>
                  {group.rows.map(row => (
                    <InfoRow key={row.label} icon={row.icon} label={row.label} value={row.value} />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingBottom: 8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  headIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: colors.heading,
  },
  scroll: {
    maxHeight: 360,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  group: {
    gap: 4,
  },
  groupSpaced: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  groupName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  groupRows: {
    marginTop: 2,
  },
});
