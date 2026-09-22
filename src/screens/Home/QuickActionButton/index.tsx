import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';

export interface QuickActionButtonProps {
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
  // Sizing ditentukan pemanggil (mis. flex:1 buat baris penuh, width tetap buat grid wrap) —
  // menghindari percentage-width dicampur gap fixed-px yang bikin kolom terakhir tidak pas nempel
  // ke tepi kanan kontainer.
  style?: StyleProp<ViewStyle>;
  // Grid 3 kolom dengan label panjang (HealthOfficerHome) — label 12px, ikut artboard-nya.
  compact?: boolean;
  // "Aksen Gradient" (DESIGN_SYSTEM.md) — chip jadi 2-tone gradient (ikon putih) bukan tint flat.
  // Opsional supaya pemanggil lama tanpa gradient tetap tampil seperti sebelumnya.
  gradientColors?: readonly [string, string];
}

// Kartu quick-action canvas (DESIGN_SYSTEM.md §4): icon-chip ber-tint warna kategori (atau
// gradient 2-tone kalau `gradientColors` diisi) + label 2 baris di bawahnya.
export default function QuickActionButton(props: QuickActionButtonProps) {
  const { icon, label, color, onPress, style, compact, gradientColors } = props;

  return (
    <PressableScale onPress={onPress} style={style} contentStyle={styles.card}>
      {gradientColors ? (
        <GradientIconChip
          icon={icon}
          colors={gradientColors}
          size={40}
          iconSize={compact ? 24 : 22}
          radius={12}
          style={styles.chip}
        />
      ) : (
        <View style={[styles.chip, { backgroundColor: `${color}1F` }]}>
          <Icon name={icon} size={compact ? 24 : 22} color={color} />
        </View>
      )}
      <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={2}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 84,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    lineHeight: 16,
    // height = 2x lineHeight — dicadangkan tetap 2 baris walau labelnya pendek (1 baris), supaya
    // ikon semua tombol dalam satu baris grid tetap sejajar (bukan naik-turun tergantung panjang label).
    height: 26,
    fontWeight: '600',
    color: colors.heading,
    textAlign: 'center',
  },
  labelCompact: {
    fontSize: 12,
    lineHeight: 14,
    height: 28,
  },
});
