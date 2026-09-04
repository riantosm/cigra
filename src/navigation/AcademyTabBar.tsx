import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { ROUTES } from '@/navigation/paths';
import { TAB_BAR_HEIGHT } from '@/navigation/tabBar';
import { colors } from '@/theme/colors';
import { tabBarShadow } from '@/theme/shadows';

const iconByRoute: Partial<Record<string, IconName>> = {
  [ROUTES.academyBeranda]: 'home',
  [ROUTES.academyAkademik]: 'academy',
  [ROUTES.academyPsikologi]: 'brain',
  [ROUTES.academyJasmani]: 'heartbeat',
  [ROUTES.academyRiwayat]: 'history',
};

// Bottom tab bar khusus Academy. Ukuran & gaya **identik** dengan bar utama (`CustomTabBar`,
// DESIGN_SYSTEM §5.10) — tinggi 64 + safe-area, sudut atas radius 24, `surface` + `tabBarShadow`,
// item aktif = pill gradient primary `minWidth 78` — hanya saja 5 item setara **tanpa** tombol
// Emergency yang menonjol di tengah.
export default function AcademyTabBar(props: BottomTabBarProps) {
  const { state, navigation, descriptors } = props;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = typeof options.title === 'string' ? options.title : route.name;

        function onPress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!event.defaultPrevented && !focused) {
            navigation.navigate(route.name);
          }
        }

        function onLongPress() {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        }

        const iconName = iconByRoute[route.name];
        const tint = focused ? colors.primaryForeground : colors.placeholder;

        return (
          <PressableScale
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
            style={styles.item}
            contentStyle={[styles.itemContent, focused && styles.pill]}>
            {focused ? (
              <Svg style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="academyTabPill" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={colors.gradientPrimaryStart} />
                    <Stop offset="1" stopColor={colors.gradientPrimaryEnd} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" rx={26} ry={26} fill="url(#academyTabPill)" />
              </Svg>
            ) : null}
            {iconName ? <Icon name={iconName} size={focused ? 22 : 24} color={tint} /> : null}
            <Text
              style={[styles.label, { color: tint }, focused && styles.labelActive]}
              numberOfLines={1}>
              {label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

// Nilai style disamakan persis dengan `src/navigation/CustomTabBar.tsx`.
const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    ...tabBarShadow,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  pill: {
    minWidth: 78,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.gradientPrimaryEnd,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  labelActive: {
    fontWeight: '700',
  },
});
