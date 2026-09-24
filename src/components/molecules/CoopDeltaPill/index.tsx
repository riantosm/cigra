import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { CoopTrendDirection } from '@/types';
import { COOP_TREND_META } from '@/utils/coopSalary';

export interface CoopDeltaPillProps {
  trend: CoopTrendDirection;
  label: string;
  style?: StyleProp<ViewStyle>;
}

// Pill naik/turun tagihan dibanding periode sebelumnya — turun hijau, naik amber, sama abu
// (COOP_TREND_META). Bentuk pill = Badge (DESIGN_SYSTEM §5.7), ikon tren menggantikan dot.
export default function CoopDeltaPill(props: CoopDeltaPillProps) {
  const { trend, label, style } = props;
  const meta = COOP_TREND_META[trend];

  return (
    <View style={[styles.container, { backgroundColor: meta.surface }, style]}>
      <Icon name={meta.icon} size={13} color={meta.color} />
      <Text style={[styles.label, { color: meta.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
