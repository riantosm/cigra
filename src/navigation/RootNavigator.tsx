import { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabNavigator from '@/navigation/MainTabNavigator';
import { ROUTES } from '@/navigation/paths';
import RequireAuth from '@/navigation/RequireAuth';
import RequireGuest from '@/navigation/RequireGuest';
import type { RootStackParamList } from '@/navigation/types';
import { locationTracking } from '@/native/locationTracking';
import LoginScreen from '@/screens/Login';
import { getAuthToken, setAuthToken } from '@/services/api/axiosInstance';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshUser } from '@/store/slices/authSlice';
import { startBackgroundLocationTracking } from '@/utils/location';
import { initializePushNotifications } from '@/utils/pushNotifications';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const isLogin = useAppSelector(state => state.auth.isLogin);
  const roles = useAppSelector(state => state.auth.user?.roles);

  useEffect(() => {
    // Sesi yang sudah login dipulihkan dari redux-persist (bukan lewat thunk `login`) tidak pernah
    // memanggil setAuthToken(), jadi TrackingPrefs di sisi native belum punya salinan token —
    // sinkronkan dulu di sini setiap kali app dibuka dengan sesi aktif, sebelum menyalakan tracking.
    if (isLogin) {
      (async () => {
        // LocationForegroundService.kt bisa refresh token-nya sendiri saat app di background —
        // kalau itu terjadi, TrackingPrefs (native) punya token lebih baru daripada AsyncStorage
        // (JS), dan token JS yang lama itu sudah dinonaktifkan permanen di backend. Jangan sampai
        // token JS yang basi ini menimpa balik token native yang masih valid: utamakan token
        // native kalau ada dan berbeda dari punya JS.
        const [jsToken, nativeToken] = await Promise.all([getAuthToken(), locationTracking.getStoredAuthToken()]);
        if (nativeToken && nativeToken !== jsToken) {
          await setAuthToken(nativeToken);
        } else {
          locationTracking.syncAuthToken(jsToken);
        }
        await startBackgroundLocationTracking();
        // Validasi sesi sedini mungkin saat app dibuka — kalau access token yang tersimpan sudah
        // kedaluwarsa, interceptor axios akan mencoba refresh otomatis (atau logout kalau gagal)
        // alih-alih menunggu sampai user membuka layar yang kebetulan manggil API.
        dispatch(refreshUser());
      })().catch(() => {});
    }
  }, [dispatch, isLogin]);

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
