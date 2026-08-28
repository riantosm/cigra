import { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabNavigator from '@/navigation/MainTabNavigator';
import { ROUTES } from '@/navigation/paths';
import RequireAuth from '@/navigation/RequireAuth';
import RequireGuest from '@/navigation/RequireGuest';
import type { RootStackParamList } from '@/navigation/types';
import { locationTracking } from '@/native/locationTracking';
import LoginScreen from '@/screens/Login';
import { getAuthToken } from '@/services/api/axiosInstance';
import { useAppSelector } from '@/store/hooks';
import { startBackgroundLocationTracking } from '@/utils/location';
import { initializePushNotifications } from '@/utils/pushNotifications';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isLogin = useAppSelector(state => state.auth.isLogin);
  const roles = useAppSelector(state => state.auth.user?.roles);

  useEffect(() => {
    // Sesi yang sudah login dipulihkan dari redux-persist (bukan lewat thunk `login`) tidak pernah
    // memanggil setAuthToken(), jadi TrackingPrefs di sisi native belum punya salinan token —
    // sinkronkan dulu di sini setiap kali app dibuka dengan sesi aktif, sebelum menyalakan tracking.
    if (isLogin) {
      (async () => {
        const token = await getAuthToken();
        locationTracking.syncAuthToken(token);
        await startBackgroundLocationTracking();
      })().catch(() => {});
    }
  }, [isLogin]);

  useEffect(() => {
    // Effect terpisah dari location tracking di atas — sengaja depend ke `roles` juga (bukan cuma
    // `isLogin`) supaya kalau role user berubah selagi masih login (mis. lewat pull-to-refresh di
    // Profile), topic yang di-subscribe ikut disesuaikan: subscribe topic baru, unsubscribe topic
    // yang sudah tidak dimiliki — tanpa perlu request izin lokasi/restart tracking lagi tiap kali.
    if (isLogin) {
      initializePushNotifications(roles ?? []).catch(() => {});
    }
  }, [isLogin, roles]);

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
