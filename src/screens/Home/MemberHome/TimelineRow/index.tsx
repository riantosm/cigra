import { StyleSheet, Text, View } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import { colors } from '@/theme/colors';
import { gradientForColor } from '@/utils/gradientColor';

export interface TimelineRowProps {
  direction: 'in' | 'out';
  title: string;
  detail: string;
  time: string;
}

const directionColor: Record<TimelineRowProps['direction'], string> = {
  in: colors.success,
  out: colors.warning,
};

// Satu baris di "Aktivitas Terbaru" pada Home Anggota — pergerakan keluar/masuk markas milik
// anggota sendiri (lihat API_CONTRACT_ANGGOTA.md §4).
export default function TimelineRow(props: TimelineRowProps) {
  const { direction, title, detail, time } = props;
  const color = directionColor[direction];

  return (
    <View style={styles.row}>
      <GradientIconChip icon="entry-exit" colors={gradientForColor(color)} size={32} iconSize={15} radius={10} />
      <View style={styles.textGroup}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Text style={styles.time} numberOfLines={1}>
        {time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  detail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
