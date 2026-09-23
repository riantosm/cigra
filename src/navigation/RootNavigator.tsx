import { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AppVersionGate from '@/components/organisms/AppVersionGate';
import MainTabNavigator from '@/navigation/MainTabNavigator';
import AcademyTabNavigator from '@/navigation/AcademyTabNavigator';
import AcademyProgramDetailScreen from '@/screens/Academy/AcademyProgramDetail';
import AcademyMaterialScreen from '@/screens/Academy/AcademyMaterial';
import AcademyAssessmentIntroScreen from '@/screens/Academy/AcademyAssessmentIntro';
import AcademyAttemptScreen from '@/screens/Academy/AcademyAttempt';
import AcademyAttemptResultScreen from '@/screens/Academy/AcademyAttemptResult';
import AcademyPracticalEntryScreen from '@/screens/Academy/AcademyPracticalEntry';
import AcademyResultDetailScreen from '@/screens/Academy/AcademyResultDetail';
import AcademyCompetencyDetailScreen from '@/screens/Academy/AcademyCompetencyDetail';
import AcademyInsProgramDetailScreen from '@/screens/Academy/AcademyInsProgramDetail';
import AcademyInsVerificationDetailScreen from '@/screens/Academy/AcademyInsVerificationDetail';
import AcademyCmdAttentionScreen from '@/screens/Academy/AcademyCmdAttention';
import AcademyCmdProgramDetailScreen from '@/screens/Academy/AcademyCmdProgramDetail';
import AcademyCmdCompetencyScreen from '@/screens/Academy/AcademyCmdCompetency';
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
import AppBootstrapScreen from '@/screens/AppBootstrap';
import AnnouncementsScreen from '@/screens/Announcements';
import BukuSakuDetailScreen from '@/screens/BukuSakuDetail';
import ComingSoonScreen from '@/screens/ComingSoon';
import DispositionComposeScreen from '@/screens/DispositionCompose';
import DispositionDetailScreen from '@/screens/DispositionDetail';
import DispositionFollowUpScreen from '@/screens/DispositionFollowUp';
import DispositionListScreen from '@/screens/DispositionList';
import DispositionRecipientSearchScreen from '@/screens/DispositionRecipientSearch';
import IncomingLetterCreateScreen from '@/screens/IncomingLetterCreate';
import IncomingLetterDetailScreen from '@/screens/IncomingLetterDetail';
import IncomingLetterListScreen from '@/screens/IncomingLetterList';
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
import PatrolActiveScreen from '@/screens/PatrolActive';
import PatrolMonitoringScreen from '@/screens/PatrolMonitoring';
import PatrolMonitoringDetailScreen from '@/screens/PatrolMonitoringDetail';
import PatrolPhotoScreen from '@/screens/PatrolPhoto';
import PatrolRouteDetailScreen from '@/screens/PatrolRouteDetail';
import PatrolScanScreen from '@/screens/PatrolScan';
import PatrolScreen from '@/screens/Patrol';
import PersonnelMapScreen from '@/screens/PersonnelMap';
import PersonnelTrackingScreen from '@/screens/PersonnelTracking';
import EditProfileScreen from '@/screens/EditProfile';
import ProfileScreen from '@/screens/Profile';
import RollCallCreateScreen from '@/screens/RollCallCreate';
import RollCallDetailScreen from '@/screens/RollCallDetail';
import RollCallEntryScreen from '@/screens/RollCallEntry';
import RollCallListScreen from '@/screens/RollCallList';
import RollCallScanScreen from '@/screens/RollCallScan';
import RollCallSearchScreen from '@/screens/RollCallSearch';
import SendAnnouncementScreen from '@/screens/SendAnnouncement';
import SettingsScreen from '@/screens/Settings';
import EarthquakeScreen from '@/screens/Earthquake';
import WeatherScreen from '@/screens/Weather';
import WeatherAlertsScreen from '@/screens/WeatherAlerts';
import { getAuthToken, setAuthToken } from '@/services/api/axiosInstance';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshUser } from '@/store/slices/authSlice';
import { startBackgroundLocationTracking } from '@/utils/location';
import { initializePushNotifications } from '@/utils/pushNotifications';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const isLogin = useAppSelector(state => state.auth.isLogin);
  const appChecked = useAppSelector(state => state.auth.appChecked);
  const roles = useAppSelector(state => state.auth.user?.roles);

  useEffect(() => {
    // Sesi yang sudah login dipulihkan dari redux-persist (bukan lewat thunk `login`) tidak pernah
    // memanggil setAuthToken(), jadi TrackingPrefs di sisi native belum punya salinan token —
    // sinkronkan dulu di sini setiap kali app dibuka dengan sesi aktif, sebelum menyalakan tracking.
    //
    // Digate ke `appChecked` supaya untuk login baru pekerjaan ini (khususnya permintaan izin)
    // TIDAK balapan dengan layar AppBootstrap yang juga memintanya — untuk warm start (sesi
    // dipulihkan, appChecked sudah true) efek ini jalan seperti biasa tanpa layar bootstrap.
    if (isLogin && appChecked) {
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
  }, [dispatch, isLogin, appChecked]);

  useEffect(() => {
    // Effect terpisah dari location tracking di atas — sengaja depend ke `roles` juga (bukan cuma
    // `isLogin`) supaya kalau role user berubah selagi masih login (mis. lewat pull-to-refresh di
    // Profile), topic yang di-subscribe ikut disesuaikan: subscribe topic baru, unsubscribe topic
    // yang sudah tidak dimiliki — tanpa perlu request izin lokasi/restart tracking lagi tiap kali.
    //
    // Digate ke `appChecked` juga: init ini memunculkan dialog izin notifikasi, dan Android hanya
    // bisa menampilkan satu dialog izin sekaligus — kalau jalan begitu login sukses, dialog lokasi
    // di layar AppBootstrap tertahan di belakangnya sampai timeout. Izin notifikasi untuk login
    // baru sudah diminta AppBootstrap (sesudah izin lokasi), jadi di sini tinggal no-op.
    if (isLogin && appChecked) {
      initializePushNotifications(roles ?? []).catch(() => {});
    }
  }, [isLogin, appChecked, roles]);

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
        <Stack.Screen name={ROUTES.appBootstrap} options={{ gestureEnabled: false }}>
          {screenProps => (
            <RequireAuth navigation={screenProps.navigation} skipAppCheckGate>
              <AppBootstrapScreen {...screenProps} />
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
        <Stack.Screen name={ROUTES.academyRoot} component={AcademyTabNavigator} />
        <Stack.Screen name={ROUTES.academyProgramDetail} component={AcademyProgramDetailScreen} />
        <Stack.Screen name={ROUTES.academyMaterial} component={AcademyMaterialScreen} />
        <Stack.Screen
          name={ROUTES.academyAssessmentIntro}
          component={AcademyAssessmentIntroScreen}
        />
        <Stack.Screen
          name={ROUTES.academyAttempt}
          component={AcademyAttemptScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name={ROUTES.academyAttemptResult}
          component={AcademyAttemptResultScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name={ROUTES.academyPracticalEntry} component={AcademyPracticalEntryScreen} />
        <Stack.Screen name={ROUTES.academyResultDetail} component={AcademyResultDetailScreen} />
        <Stack.Screen
          name={ROUTES.academyCompetencyDetail}
          component={AcademyCompetencyDetailScreen}
        />
        <Stack.Screen
          name={ROUTES.academyInsProgramDetail}
          component={AcademyInsProgramDetailScreen}
        />
        <Stack.Screen
          name={ROUTES.academyInsVerificationDetail}
          component={AcademyInsVerificationDetailScreen}
        />
        <Stack.Screen name={ROUTES.academyCmdAttention} component={AcademyCmdAttentionScreen} />
        <Stack.Screen
          name={ROUTES.academyCmdProgramDetail}
          component={AcademyCmdProgramDetailScreen}
        />
        <Stack.Screen name={ROUTES.academyCmdCompetency} component={AcademyCmdCompetencyScreen} />
        <Stack.Screen name={ROUTES.catalogList} component={CatalogListScreen} />
        <Stack.Screen name={ROUTES.catalogDetail} component={CatalogDetailScreen} />
        <Stack.Screen name={ROUTES.profile} component={ProfileScreen} />
        <Stack.Screen name={ROUTES.editProfile} component={EditProfileScreen} />
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
        <Stack.Screen name={ROUTES.weather} component={WeatherScreen} />
        <Stack.Screen name={ROUTES.weatherAlerts} component={WeatherAlertsScreen} />
        <Stack.Screen name={ROUTES.earthquake} component={EarthquakeScreen} />
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
        <Stack.Screen name={ROUTES.patrol} component={PatrolScreen} />
        <Stack.Screen name={ROUTES.patrolRouteDetail} component={PatrolRouteDetailScreen} />
        <Stack.Screen name={ROUTES.patrolActive} component={PatrolActiveScreen} />
        <Stack.Screen name={ROUTES.patrolScan} component={PatrolScanScreen} />
        <Stack.Screen name={ROUTES.patrolPhoto} component={PatrolPhotoScreen} />
        <Stack.Screen name={ROUTES.patrolMonitoring} component={PatrolMonitoringScreen} />
        <Stack.Screen
          name={ROUTES.patrolMonitoringDetail}
          component={PatrolMonitoringDetailScreen}
        />
        <Stack.Screen name={ROUTES.dispositionList} component={DispositionListScreen} />
        <Stack.Screen name={ROUTES.dispositionDetail} component={DispositionDetailScreen} />
        <Stack.Screen name={ROUTES.dispositionFollowUp} component={DispositionFollowUpScreen} />
        <Stack.Screen name={ROUTES.dispositionCompose} component={DispositionComposeScreen} />
        <Stack.Screen
          name={ROUTES.dispositionRecipientSearch}
          component={DispositionRecipientSearchScreen}
        />
        <Stack.Screen name={ROUTES.incomingLetterList} component={IncomingLetterListScreen} />
        <Stack.Screen name={ROUTES.incomingLetterCreate} component={IncomingLetterCreateScreen} />
        <Stack.Screen name={ROUTES.incomingLetterDetail} component={IncomingLetterDetailScreen} />
      </Stack.Navigator>
    </>
  );
}
