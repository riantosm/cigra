import { StyleSheet, Text, View } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import Icon from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export interface ActivityRowProps {
  name: string;
  detail: string;
  time: string;
  direction: 'in' | 'out';
  // "Aksen Gradient" (DESIGN_SYSTEM.md) — chip jadi 2-tone gradient (ikon putih) bukan tint flat.
  gradientColors?: readonly [string, string];
}

const directionColor: Record<ActivityRowProps['direction'], string> = {
  in: colors.success,
  out: colors.warning,
};

// Satu baris "Aktivitas Terbaru" di CommanderHome — struktur identik dengan MemberHome/TimelineRow
// (DESIGN_SYSTEM.md §5.16): icon-chip ber-tint arah (atau gradient kalau `gradientColors` diisi),
// judul 1 baris, detail 2 baris, waktu di kanan.
export default function ActivityRow(props: ActivityRowProps) {
  const { name, detail, time, direction, gradientColors } = props;
  const color = directionColor[direction];

  return (
    <View style={styles.row}>
      {gradientColors ? (
        <GradientIconChip icon="entry-exit" colors={gradientColors} size={32} iconSize={15} radius={10} style={styles.iconWrap} />
      ) : (
        <View style={[styles.iconWrap, { backgroundColor: `${color}1F` }]}>
          <Icon name="entry-exit" size={15} color={color} />
        </View>
      )}
      <View style={styles.textGroup}>
        <Text style={styles.title} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.detail} numberOfLines={2}>
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
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.heading,
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
