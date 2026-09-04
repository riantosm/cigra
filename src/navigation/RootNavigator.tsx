import { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AppVersionGate from '@/components/organisms/AppVersionGate';
import MainTabNavigator from '@/navigation/MainTabNavigator';
import { ROUTES } from '@/navigation/paths';
import RequireAuth from '@/navigation/RequireAuth';
import RequireGuest from '@/navigation/RequireGuest';
import type { RootStackParamList } from '@/navigation/types';
import { locationTracking } from '@/native/locationTracking';
import CatalogDetailScreen from '@/screens/CatalogDetail';
import CatalogListScreen from '@/screens/CatalogList';
import ChangePasswordScreen from '@/screens/ChangePassword';
import ActivityMovementsScreen from '@/screens/ActivityMovements';
import AlarmSatuanScreen from '@/screens/AlarmSatuan';
import AnnouncementsScreen from '@/screens/Announcements';
import BukuSakuDetailScreen from '@/screens/BukuSakuDetail';
import ComingSoonScreen from '@/screens/ComingSoon';
import EmergencyContactsScreen from '@/screens/EmergencyContacts';
import EmergencyDetailScreen from '@/screens/EmergencyDetail';
import EmergencyListScreen from '@/screens/EmergencyList';
import ForgotPasswordScreen from '@/screens/ForgotPassword';
import HealthDashboardScreen from '@/screens/HealthDashboard';
import HealthMyHistoryScreen from '@/screens/HealthMyHistory';
import HealthPersonnelProfileScreen from '@/screens/HealthPersonnelProfile';
import HealthPersonnelSearchScreen from '@/screens/HealthPersonnelSearch';
import HealthRecordDetailScreen from '@/screens/HealthRecordDetail';
import HealthRecordInputScreen from '@/screens/HealthRecordInput';
import LoginScreen from '@/screens/Login';
import MeFamilyDetailScreen from '@/screens/MeFamilyDetail';
import MyMovementsScreen from '@/screens/MyMovements';
import NotificationsScreen from '@/screens/Notifications';
import PersonnelMapScreen from '@/screens/PersonnelMap';
import PersonnelTrackingScreen from '@/screens/PersonnelTracking';
import ProfileScreen from '@/screens/Profile';
import RollCallCreateScreen from '@/screens/RollCallCreate';
import RollCallDetailScreen from '@/screens/RollCallDetail';
import RollCallEntryScreen from '@/screens/RollCallEntry';
import RollCallListScreen from '@/screens/RollCallList';
import RollCallScanScreen from '@/screens/RollCallScan';
import RollCallSearchScreen from '@/screens/RollCallSearch';
import SendAnnouncementScreen from '@/screens/SendAnnouncement';
import SettingsScreen from '@/screens/Settings';
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
    <>
      <AppVersionGate />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name={ROUTES.login}>
          {screenProps => (
            <RequireGuest navigation={screenProps.navigation}>
              <LoginScreen {...screenProps} />
            </RequireGuest>
          )}
        </Stack.Screen>
        <Stack.Screen name={ROUTES.forgotPassword}>
          {screenProps => (
            <RequireGuest navigation={screenProps.navigation}>
              <ForgotPasswordScreen {...screenProps} />
            </RequireGuest>
          )}
        </Stack.Screen>
        <Stack.Screen name={ROUTES.changePassword}>
          {screenProps => (
            <RequireAuth navigation={screenProps.navigation} skipPasswordChangeGate>
              <ChangePasswordScreen {...screenProps} />
            </RequireAuth>
          )}
        </Stack.Screen>
        <Stack.Screen name={ROUTES.main}>
          {screenProps => (
            <RequireAuth navigation={screenProps.navigation}>
              <MainTabNavigator />
            </RequireAuth>
          )}
        </Stack.Screen>
        <Stack.Screen name={ROUTES.catalogList} component={CatalogListScreen} />
        <Stack.Screen name={ROUTES.catalogDetail} component={CatalogDetailScreen} />
        <Stack.Screen name={ROUTES.profile} component={ProfileScreen} />
        <Stack.Screen name={ROUTES.settings} component={SettingsScreen} />
        <Stack.Screen name={ROUTES.comingSoon} component={ComingSoonScreen} />
        <Stack.Screen name={ROUTES.bukuSakuDetail} component={BukuSakuDetailScreen} />
        <Stack.Screen name={ROUTES.personnelMap} component={PersonnelMapScreen} />
        <Stack.Screen name={ROUTES.personnelTracking} component={PersonnelTrackingScreen} />
        <Stack.Screen name={ROUTES.notifications} component={NotificationsScreen} />
        <Stack.Screen name={ROUTES.emergencyList} component={EmergencyListScreen} />
        <Stack.Screen name={ROUTES.emergencyDetail} component={EmergencyDetailScreen} />
        <Stack.Screen name={ROUTES.emergencyContacts} component={EmergencyContactsScreen} />
        <Stack.Screen name={ROUTES.announcements} component={AnnouncementsScreen} />
        <Stack.Screen name={ROUTES.myMovements} component={MyMovementsScreen} />
        <Stack.Screen name={ROUTES.meFamilyDetail} component={MeFamilyDetailScreen} />
        <Stack.Screen name={ROUTES.activityMovements} component={ActivityMovementsScreen} />
        <Stack.Screen name={ROUTES.sendAnnouncement} component={SendAnnouncementScreen} />
        <Stack.Screen name={ROUTES.alarmSatuan} component={AlarmSatuanScreen} />
        <Stack.Screen name={ROUTES.healthDashboard} component={HealthDashboardScreen} />
        <Stack.Screen name={ROUTES.healthPersonnelSearch} component={HealthPersonnelSearchScreen} />
        <Stack.Screen name={ROUTES.healthPersonnelProfile} component={HealthPersonnelProfileScreen} />
        <Stack.Screen name={ROUTES.healthRecordInput} component={HealthRecordInputScreen} />
        <Stack.Screen name={ROUTES.healthRecordDetail} component={HealthRecordDetailScreen} />
        <Stack.Screen name={ROUTES.healthMyHistory} component={HealthMyHistoryScreen} />
        <Stack.Screen name={ROUTES.rollCallList} component={RollCallListScreen} />
        <Stack.Screen name={ROUTES.rollCallCreate} component={RollCallCreateScreen} />
        <Stack.Screen name={ROUTES.rollCallDetail} component={RollCallDetailScreen} />
        <Stack.Screen name={ROUTES.rollCallSearch} component={RollCallSearchScreen} />
        <Stack.Screen name={ROUTES.rollCallScan} component={RollCallScanScreen} />
        <Stack.Screen name={ROUTES.rollCallEntry} component={RollCallEntryScreen} />
      </Stack.Navigator>
    </>
  );
}
