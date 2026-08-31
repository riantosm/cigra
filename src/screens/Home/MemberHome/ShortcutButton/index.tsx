import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';

export interface ShortcutButtonProps {
  icon: IconName;
  color: string;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

// Tombol di baris "Akses Cepat" pada Home Anggota — ikon bulat berwarna + label, tanpa border
// kartu (beda dengan QuickActionButton milik CommanderHome yang berupa kartu).
export default function ShortcutButton(props: ShortcutButtonProps) {
  const { icon, color, label, onPress, style } = props;

  return (
    <PressableScale onPress={onPress} style={style} contentStyle={styles.button}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
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
  iconWrap: {
    height: 44,
    width: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
