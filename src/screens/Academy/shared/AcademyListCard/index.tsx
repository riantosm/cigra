import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import GradientIconBadge from '@/components/molecules/GradientIconBadge';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';

export interface AcademyListCardProps {
  icon: IconName;
  gradientStart: string;
  gradientEnd: string;
  title: string;
  subtitle: string;
  /** Baris meta kecil di bawah subjudul (mis. "0 tes tersedia"). */
  meta?: string;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Baris-kartu horizontal `[badge] judul + subjudul (+ meta)  [chevron]` — dipakai di grup Academy
// (daftar program Akademik, daftar Modul TKD, kelompok tes Psikologi). Artboard "Academy — …".
export default function AcademyListCard(props: AcademyListCardProps) {
  const { icon, gradientStart, gradientEnd, title, subtitle, meta, disabled, onPress, style } = props;

  return (
    <PressableScale
      scaleTo={0.98}
      disabled={disabled}
      onPress={onPress}
      style={style}
      contentStyle={[styles.card, disabled && styles.disabled]}>
      <GradientIconBadge
        icon={icon}
        gradientStart={gradientStart}
        gradientEnd={gradientEnd}
        size={50}
      />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      <Icon name="arrow-right" size={18} color={colors.placeholder} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...cardShadow,
  },
  disabled: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  meta: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
