import { StyleSheet } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';

export default function EmergencyTabButton(props: BottomTabBarButtonProps) {
  const { onPress } = props;

  return (
    <PressableScale
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel="Emergency"
      onPress={onPress}
      style={styles.wrapper}
      contentStyle={styles.button}>
      <Icon name="emergency" size={30} color={colors.dangerForeground} />
    </PressableScale>
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
