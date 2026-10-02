import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import EmergencyTabButton from '@/components/organisms/EmergencyTabButton';
import { ROUTES } from '@/navigation/paths';
import { TAB_BAR_HEIGHT } from '@/navigation/tabBar';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { tabBarShadow } from '@/theme/shadows';
import { isDisplayablePhoto } from '@/utils/avatar';
import { cleanValue } from '@/utils/format';

const iconByRoute: Partial<Record<string, IconName>> = {
  [ROUTES.home]: 'home',
  [ROUTES.riwayat]: 'history',
  [ROUTES.bukuSaku]: 'handbook',
};

// Ikon tab Profile = foto user (fallback inisial) dalam lingkaran seukuran ikon tab lain — cincin
// putih saat aktif (di atas pill biru), cincin lembut saat tidak aktif. Menggantikan avatar di
// header layar (HomeHeader sudah tidak punya avatar → Profile).
function ProfileTabIcon(props: { focused: boolean }) {
  const { focused } = props;
  const user = useAppSelector(state => state.auth.user);
  const photoPath = user?.personnel?.photo;
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const initial = (cleanValue(user?.personnel?.full_name) ?? cleanValue(user?.name) ?? 'U')
    .charAt(0)
    .toUpperCase();
  const showPhoto = isDisplayablePhoto(photoPath) && failedPath !== photoPath;

  return (
    <View
      style={[
        styles.avatar,
        focused ? styles.avatarFocused : styles.avatarIdle,
        !showPhoto && (focused ? styles.avatarInitialFocused : styles.avatarInitialIdle),
      ]}>
      {showPhoto ? (
        <SecureImage
          path={photoPath}
          // FastImage hanya menerima style statis bernilai angka — satu style per ukuran.
          style={focused ? styles.avatarPhotoFocused : styles.avatarPhotoIdle}
          onLoadError={() => setFailedPath(photoPath ?? null)}
        />
      ) : (
        <Text style={[styles.avatarInitial, focused && styles.avatarInitialTextFocused]}>
          {initial}
        </Text>
      )}
    </View>
  );
}

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
          if (event.defaultPrevented) {
            return;
          }
          if (!focused) {
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
            {route.name === ROUTES.profile ? (
              <ProfileTabIcon focused={focused} />
            ) : iconName ? (
              <Icon name={iconName} size={focused ? 22 : 24} color={tint} />
            ) : null}
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
  // Lingkaran avatar tab Profile — ukuran sama dengan ikon tab lain (22 aktif / 24 tidak aktif).
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    backgroundColor: colors.neutralSurface,
  },
  avatarFocused: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderColor: colors.primaryForeground,
  },
  avatarIdle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderColor: colors.borderSoft,
  },
  // Ukuran foto = lingkaran dikurangi cincin (2 × 1.5).
  avatarPhotoFocused: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
  },
  avatarPhotoIdle: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
  },
  avatarInitialIdle: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  avatarInitialFocused: {
    backgroundColor: colors.primaryForeground,
  },
  avatarInitial: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  avatarInitialTextFocused: {
    color: colors.primary,
  },
});
