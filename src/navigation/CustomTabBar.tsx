import { StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import EmergencyTabButton from '@/components/organisms/EmergencyTabButton';
import { ROUTES } from '@/navigation/paths';
import { TAB_BAR_HEIGHT } from '@/navigation/tabBar';
import { colors } from '@/theme/colors';
import { tabBarShadow } from '@/theme/shadows';

const iconByRoute: Partial<Record<string, IconName>> = {
  [ROUTES.home]: 'home',
  [ROUTES.riwayat]: 'history',
  [ROUTES.bukuSaku]: 'handbook',
  [ROUTES.lainnya]: 'grid',
};

export interface CustomTabBarProps extends BottomTabBarProps {
  // Pesan "ketuk N kali lagi" dari EmergencyTabButton — di-render sebagai sibling di MainTabNavigator
  // (bukan di dalam tab bar) supaya lebar teksnya tidak terjepit slot tab. Lihat MainTabNavigator.
  onEmergencyToastChange: (message: string | null) => void;
}

// Tab bar bawah kustom (DESIGN_SYSTEM.md §5.10) — menggantikan tab bar bawaan react-navigation
// supaya item aktif benar-benar berupa pill gradient primary dan tombol Emergency di tengah
// berupa lingkaran gradient danger yang terangkat, persis artboard.
export default function CustomTabBar(props: CustomTabBarProps) {
  const { state, navigation, descriptors, onEmergencyToastChange } = props;
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

        // Item tengah = tombol panik. Tetap pakai komponennya sendiri (tap-counting + StatusModal).
        if (route.name === ROUTES.emergency) {
          return (
            <View key={route.key} style={styles.item}>
              <EmergencyTabButton
                onToastChange={onEmergencyToastChange}
                onOpenEmergencyScreen={() => navigation.navigate(route.name)}
              />
            </View>
          );
        }

        function onPress() {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
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
                  <LinearGradient id="tabPill" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={colors.gradientPrimaryStart} />
                    <Stop offset="1" stopColor={colors.gradientPrimaryEnd} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" rx={26} ry={26} fill="url(#tabPill)" />
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
    // minWidth biar label pendek ("Home") tetap berbentuk oval, bukan lingkaran — samakan proporsi
    // dengan pill label panjang ("Buku Saku").
    minWidth: 78,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    // Warna solid = shape opaque buat iOS mengecor bayangan dari balik SVG-nya.
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
