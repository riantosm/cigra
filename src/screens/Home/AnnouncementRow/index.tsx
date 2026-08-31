import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export interface AnnouncementRowProps {
  icon: IconName;
  title: string;
  detail: string;
  time: string;
  sender: string;
  color: string;
  unread?: boolean;
}

// Satu baris "Pengumuman Terbaru" di CommanderHome — struktur identik dengan MemberHome/NoticeRow
// (DESIGN_SYSTEM.md §5.16): icon-chip ber-tint, judul + waktu di baris atas, detail, pengirim,
// titik "belum dibaca".
export default function AnnouncementRow(props: AnnouncementRowProps) {
  const { icon, title, detail, time, sender, color, unread } = props;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}1F` }]}>
        <Icon name={icon} size={15} color={color} />
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
        <Text style={styles.detail} numberOfLines={2}>
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
    minWidth: 0,
    gap: 4,
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
    color: colors.heading,
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
