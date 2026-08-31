import { StyleSheet, Text } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import GradientIconBadge from '@/components/molecules/GradientIconBadge';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';

export interface MenuCardProps extends PressableProps {
  icon: IconName;
  gradientStart: string;
  gradientEnd: string;
  title: string;
  subtitle: string;
  style?: StyleProp<ViewStyle>;
}

export default function MenuCard(props: MenuCardProps) {
  const { icon, gradientStart, gradientEnd, title, subtitle, style, ...rest } = props;

  return (
    <PressableScale scaleTo={0.97} style={style} contentStyle={styles.card} {...rest}>
      <GradientIconBadge
        icon={icon}
        gradientStart={gradientStart}
        gradientEnd={gradientEnd}
        size={44}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 16,
    gap: 4,
    ...cardShadow,
  },
  title: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: colors.heading,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
});
