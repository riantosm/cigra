import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export interface InfoRowProps {
  icon: IconName;
  label: string;
  value: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function InfoRow(props: InfoRowProps) {
  const { icon, label, value, style } = props;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelGroup}>
        <Icon name={icon} size={18} color={colors.primary} />
        <Text style={styles.label}>{label}</Text>
      </View>
      {typeof value === 'string' ? <Text style={styles.value}>{value}</Text> : value}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
  },
  value: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
});
