import { Platform, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';

export interface CodeChipProps extends ViewProps {
  code: string;
  style?: StyleProp<ViewStyle>;
}

// Pill kode teknis (mis. "PTR-OUTER-01", "CHK-PTR-3") — monospace, tint netral.
// Dipakai di layar Patroli (rute & checkpoint).
export default function CodeChip(props: CodeChipProps) {
  const { code, style, ...rest } = props;

  return (
    <View style={[styles.container, style]} {...rest}>
      <Text style={styles.text}>{code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.chipSurface,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textMuted,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});
