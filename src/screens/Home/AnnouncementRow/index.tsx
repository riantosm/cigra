import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export interface AnnouncementRowProps {
  icon: IconName;
  title: string;
  detail: string;
  time: string;
  color: string;
}

export default function AnnouncementRow(props: AnnouncementRowProps) {
  const { icon, title, detail, time, color } = props;

  return (
    <View style={styles.container}>
      <Icon name={icon} size={18} color={color} />
      <View style={styles.textGroup}>
        <Text style={[styles.title, { color }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  detail: {
    fontSize: 12,
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
