import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export type NoticeType = 'alert' | 'announcement' | 'info';

export interface NoticeRowProps {
  type: NoticeType;
  title: string;
  detail: string;
  sender: string;
  time: string;
  unread?: boolean;
}

const typeIcon: Record<NoticeType, IconName> = {
  alert: 'alert-triangle',
  announcement: 'megaphone',
  info: 'calendar',
};

const typeColor: Record<NoticeType, string> = {
  alert: colors.danger,
  announcement: colors.primary,
  info: colors.warning,
};

// Satu baris di "Pengumuman Terbaru" pada Home Anggota — subset dari GET /announcements
// (lihat API_CONTRACT_ANGGOTA.md §5).
export default function NoticeRow(props: NoticeRowProps) {
  const { type, title, detail, sender, time, unread } = props;
  const color = typeColor[type];

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
        <Icon name={typeIcon[type]} size={15} color={color} />
      </View>
      <View style={styles.textGroup}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.time} numberOfLines={1}>
            {time}
          </Text>
        </View>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
        <Text style={styles.sender} numberOfLines={1}>
          {sender}
        </Text>
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
  },
  iconWrap: {
    height: 32,
    width: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  detail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sender: {
    fontSize: 11,
    color: colors.textMuted,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dot: {
    marginTop: 4,
    height: 6,
    width: 6,
    borderRadius: 3,
  },
});
