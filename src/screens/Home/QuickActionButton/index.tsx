import { StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';

export interface QuickActionButtonProps {
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
  // Sizing ditentukan pemanggil (mis. flex:1 buat baris penuh, width tetap buat grid wrap) —
  // menghindari percentage-width dicampur gap fixed-px yang bikin kolom terakhir tidak pas nempel
  // ke tepi kanan kontainer.
  style?: StyleProp<ViewStyle>;
}

export default function QuickActionButton(props: QuickActionButtonProps) {
  const { icon, label, color, onPress, style } = props;

  return (
    <PressableScale onPress={onPress} style={style} contentStyle={styles.card}>
      <Icon name={icon} size={20} color={color} />
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 80,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: {
    fontSize: 12,
    lineHeight: 14,
    // height = 2x lineHeight — dicadangkan tetap 2 baris walau labelnya pendek (1 baris), supaya
    // ikon semua tombol dalam satu baris grid tetap sejajar (bukan naik-turun tergantung panjang label).
    height: 28,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
