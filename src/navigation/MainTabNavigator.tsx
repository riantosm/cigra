import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import EmergencyTabButton from '@/components/organisms/EmergencyTabButton';
import { ROUTES } from '@/navigation/paths';
import { TAB_BAR_HEIGHT } from '@/navigation/tabBar';
import type { MainTabParamList } from '@/navigation/types';
import BukuSakuScreen from '@/screens/BukuSaku';
import EmergencyScreen from '@/screens/Emergency';
import HomeScreen from '@/screens/Home';
import LainnyaScreen from '@/screens/Lainnya';
import RiwayatScreen from '@/screens/Riwayat';
import { colors } from '@/theme/colors';
import { pressTransition } from '@/utils/motion';

const Tab = createBottomTabNavigator<MainTabParamList>();

const iconByRoute: Partial<Record<keyof MainTabParamList, IconName>> = {
  [ROUTES.home]: 'home',
  [ROUTES.riwayat]: 'history',
  [ROUTES.bukuSaku]: 'handbook',
  [ROUTES.lainnya]: 'grid',
};

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  // Owned here, not inside EmergencyTabButton: that button renders inside a `flex: 1` tab-bar
  // item roughly 1/5 of the screen wide, and an absolutely positioned view with no explicit width
  // nested in there gets its width clamped to that narrow slot on Android instead of sizing to
  // its own text. Rendering the toast as a sibling of <Tab.Navigator> gives it the full screen
  // width to size against. (An earlier attempt used a Modal for the same reason, but Android
  // Dialogs intercept touches for the whole screen while visible, blocking further taps on the
  // button underneath — a plain absolutely positioned, pointerEvents="none" view doesn't.)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return (
    <View style={styles.root}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarShowLabel: true,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarItemStyle: { paddingTop: 8 },
          // react-navigation's documented tabBarIcon render-prop pattern — not a component defined during render.
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({ color, size }) => {
            const name = iconByRoute[route.name];
            return name ? <Icon name={name} color={color} size={size} /> : null;
          },
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 0,
            backgroundColor: colors.surface,
            shadowColor: '#000000',
            shadowOpacity: 0.1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 8,
          },
        })}>
        <Tab.Screen name={ROUTES.home} component={HomeScreen} options={{ title: 'Home' }} />
        <Tab.Screen name={ROUTES.riwayat} component={RiwayatScreen} options={{ title: 'Riwayat' }} />
        <Tab.Screen
          name={ROUTES.emergency}
          component={EmergencyScreen}
          options={{
            title: 'Emergency',
            // eslint-disable-next-line react/no-unstable-nested-components
            tabBarButton: buttonProps => <EmergencyTabButton {...buttonProps} onToastChange={setToastMessage} />,
          }}
        />
        <Tab.Screen name={ROUTES.bukuSaku} component={BukuSakuScreen} options={{ title: 'Buku Saku' }} />
        <Tab.Screen name={ROUTES.lainnya} component={LainnyaScreen} options={{ title: 'Lainnya' }} />
      </Tab.Navigator>

      {toastMessage ? (
        <View
          style={[styles.toastOverlay, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 }]}
          pointerEvents="none">
          <MotiView
            key={toastMessage}
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={pressTransition}
            style={styles.toast}>
            <Text style={styles.toastText} numberOfLines={1}>
              {toastMessage}
            </Text>
          </MotiView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toastOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  toast: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.text,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.surface,
    textAlign: 'center',
  },
});
