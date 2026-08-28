import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { MotiView } from 'moti';

import type { IconName } from '@/components/atoms/Icon';
import GradientIconBadge from '@/components/molecules/GradientIconBadge';
import { colors } from '@/theme/colors';
import { pressTransition } from '@/utils/motion';

export interface MenuCardProps extends PressableProps {
  icon: IconName;
  gradientStart: string;
  gradientEnd: string;
  title: string;
  subtitle: string;
  style?: StyleProp<ViewStyle>;
}

export default function MenuCard(props: MenuCardProps) {
  const { icon, gradientStart, gradientEnd, title, subtitle, style, onPressIn, onPressOut, ...rest } =
    props;
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPressIn={event => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={style}
      {...rest}>
      <MotiView
        animate={{ scale: pressed ? 0.97 : 1 }}
        transition={pressTransition}
        style={styles.card}>
        <GradientIconBadge icon={icon} gradientStart={gradientStart} gradientEnd={gradientEnd} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </MotiView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
  },
  title: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
});
