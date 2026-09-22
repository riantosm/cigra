import { StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { gradientForColor } from '@/utils/gradientColor';

export interface ShortcutButtonProps {
  icon: IconName;
  color: string;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

// Tombol di baris "Akses Cepat" pada Home Anggota — ikon bulat gradient + label, tanpa border
// kartu (beda dengan QuickActionButton milik CommanderHome yang berupa kartu).
export default function ShortcutButton(props: ShortcutButtonProps) {
  const { icon, color, label, onPress, style } = props;

  return (
    <PressableScale onPress={onPress} style={style} contentStyle={styles.button}>
      <GradientIconChip icon={icon} colors={gradientForColor(color)} size={44} iconSize={20} radius={16} />
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    lineHeight: 13,
    height: 26,
    fontWeight: '600',
    color: colors.heading,
    textAlign: 'center',
  },
});
