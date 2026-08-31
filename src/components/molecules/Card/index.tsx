import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';

export interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export default function Card(props: CardProps) {
  const { style, children, ...rest } = props;

  return (
    <View style={[styles.container, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 16,
    ...cardShadow,
  },
});
