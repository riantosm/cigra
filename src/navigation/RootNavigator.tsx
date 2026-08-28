import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabNavigator from '@/navigation/MainTabNavigator';
import { ROUTES } from '@/navigation/paths';
import RequireAuth from '@/navigation/RequireAuth';
import RequireGuest from '@/navigation/RequireGuest';
import type { RootStackParamList } from '@/navigation/types';
import LoginScreen from '@/screens/Login';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ROUTES.login}>
        {screenProps => (
          <RequireGuest navigation={screenProps.navigation}>
            <LoginScreen {...screenProps} />
          </RequireGuest>
        )}
      </Stack.Screen>
      <Stack.Screen name={ROUTES.main}>
        {screenProps => (
          <RequireAuth navigation={screenProps.navigation}>
            <MainTabNavigator />
          </RequireAuth>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
