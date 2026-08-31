import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';

export interface AuthToggleOption<T extends string> {
  value: T;
  label: string;
  icon: IconName;
}

export interface AuthToggleProps<T extends string> {
  options: AuthToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

// Canvas-theme segmented toggle (DESIGN_SYSTEM.md §1b pill controls) — the Login "Password / Kode OTP"
// switch. Active segment gets the primary gradient + glow; inactive segments are plain muted.
export default function AuthToggle<T extends string>(props: AuthToggleProps<T>) {
  const { options, value, onChange } = props;

  return (
    <View style={styles.track}>
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <PressableScale
            key={option.value}
            style={styles.segmentWrapper}
            contentStyle={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}>
            {isActive ? (
              <Svg style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="authToggle" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={colors.gradientPrimaryStart} />
                    <Stop offset="1" stopColor={colors.gradientPrimaryEnd} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#authToggle)" />
              </Svg>
            ) : null}
            <Icon
              name={option.icon}
              size={16}
              color={isActive ? colors.primaryForeground : colors.textMuted}
            />
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 6,
    padding: 5,
    borderRadius: 999,
    backgroundColor: colors.pillTrackSurface,
    borderWidth: 1,
    borderColor: colors.pillTrackBorder,
  },
  segmentWrapper: {
    flex: 1,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 999,
    overflow: 'hidden',
  },
  segmentActive: {
    backgroundColor: colors.gradientPrimaryEnd,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.primaryForeground,
  },
  labelInactive: {
    color: colors.textMuted,
  },
});
