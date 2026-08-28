import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';
import { pressTransition } from '@/utils/motion';

export default function EmergencyTabButton(props: BottomTabBarButtonProps) {
  const { onPress } = props;
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Emergency"
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={styles.wrapper}>
      <MotiView
        animate={{ scale: pressed ? 0.94 : 1 }}
        transition={pressTransition}
        style={styles.button}>
        <Icon name="emergency" size={30} color={colors.dangerForeground} />
      </MotiView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    top: -20,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    height: 60,
    width: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
