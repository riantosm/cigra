import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  // Ikon kecil di kiri label. Diabaikan kalau `dotColor` diisi.
  icon?: IconName;
  // Bulatan berwarna di kiri label (mis. indikator prioritas).
  dotColor?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

// Toggle pilih-satu bergaya "segmented" (pola yang sebelumnya di-hand-roll di layar Login).
export default function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  const { options, value, onChange, style } = props;

  return (
    <View style={[styles.container, style]}>
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <PressableScale
            key={option.value}
            style={styles.itemWrapper}
            contentStyle={[styles.item, isActive && styles.itemActive]}
            onPress={() => onChange(option.value)}>
            {option.dotColor ? (
              <View style={[styles.dot, { backgroundColor: option.dotColor }]} />
            ) : option.icon ? (
              <Icon name={option.icon} size={14} color={isActive ? colors.primary : colors.textMuted} />
            ) : null}
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.neutralSurface,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  itemWrapper: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  itemActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dot: {
    height: 7,
    width: 7,
    borderRadius: 3.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.primary,
  },
});
