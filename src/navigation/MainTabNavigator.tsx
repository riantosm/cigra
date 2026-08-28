import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import EmergencyTabButton from '@/components/organisms/EmergencyTabButton';
import { ROUTES } from '@/navigation/paths';
import type { MainTabParamList } from '@/navigation/types';
import BukuSakuScreen from '@/screens/BukuSaku';
import EmergencyScreen from '@/screens/Emergency';
import HomeScreen from '@/screens/Home';
import ProfileScreen from '@/screens/Profile';
import RiwayatScreen from '@/screens/Riwayat';
import { colors } from '@/theme/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

const iconByRoute: Partial<Record<keyof MainTabParamList, IconName>> = {
  [ROUTES.home]: 'home',
  [ROUTES.riwayat]: 'history',
  [ROUTES.bukuSaku]: 'handbook',
  [ROUTES.profile]: 'profile',
};

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
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
          left: 16,
          right: 16,
          bottom: insets.bottom + 12,
          height: 64,
          borderRadius: 24,
          borderTopWidth: 0,
          backgroundColor: colors.surface,
          shadowColor: '#000000',
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
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
          tabBarButton: buttonProps => <EmergencyTabButton {...buttonProps} />,
        }}
      />
      <Tab.Screen name={ROUTES.bukuSaku} component={BukuSakuScreen} options={{ title: 'Buku Saku' }} />
      <Tab.Screen name={ROUTES.profile} component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
