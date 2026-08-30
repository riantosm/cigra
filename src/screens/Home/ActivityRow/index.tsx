import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export interface ActivityRowProps {
  name: string;
  detail: string;
  time: string;
  direction: 'in' | 'out';
}

const directionColor: Record<ActivityRowProps['direction'], string> = {
  in: colors.success,
  out: colors.warning,
};

export default function ActivityRow(props: ActivityRowProps) {
  const { name, detail, time, direction } = props;

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarLabel}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.textGroup}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <View style={styles.timeGroup}>
        <Text style={styles.time}>{time}</Text>
        <Icon name="entry-exit" size={14} color={directionColor[direction]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  avatar: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralSurface,
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  detail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  timeGroup: {
    alignItems: 'flex-end',
    gap: 4,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
