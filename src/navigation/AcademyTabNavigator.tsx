import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenBackground from '@/components/atoms/ScreenBackground';
import AcademyTabBar from '@/navigation/AcademyTabBar';
import { ROUTES } from '@/navigation/paths';
import type { AcademyTabParamList, RootStackScreenProps } from '@/navigation/types';
import AcademyHeader from '@/screens/Academy/AcademyHeader';
import AcademyAkademikScreen from '@/screens/Academy/Akademik';
import AcademyBerandaScreen from '@/screens/Academy/Beranda';
import AcademyJasmaniScreen from '@/screens/Academy/Jasmani';
import AcademyPsikologiScreen from '@/screens/Academy/Psikologi';
import AcademyRiwayatScreen from '@/screens/Academy/Riwayat';
import { useAppSelector } from '@/store/hooks';
import { cleanValue } from '@/utils/format';

const Tab = createBottomTabNavigator<AcademyTabParamList>();

export type AcademyRootScreenProps = RootStackScreenProps<typeof ROUTES.academyRoot>;

// Academy = "sub-app": layar root-stack ini membungkus bottom-tab navigator Academy sendiri
// (Beranda / Akademik / Psikologi / Jasmani / Riwayat) + chrome tetap `AcademyHeader`. Di-push
// dari tab "Academy" di bar utama (lihat `CustomTabBar`). Hanya "Beranda" yang sudah berisi;
// empat modul lain masih placeholder "Segera Hadir".
export default function AcademyTabNavigator(props: AcademyRootScreenProps) {
  const { navigation } = props;
  const user = useAppSelector(state => state.auth.user);

  const fullName =
    cleanValue(user?.personnel?.full_name) ?? cleanValue(user?.name) ?? 'Prajurit';
  const initial = fullName.charAt(0).toUpperCase();

  // Catatan: perilaku "ketuk 2x untuk keluar dari Academy" ada di layar Beranda
  // (`src/screens/Academy/Beranda`) — meniru app utama yang menaruh `useDoubleBackToExit` hanya di
  // Home, sehingga back dari tab lain lebih dulu kembali ke Beranda (perilaku bawaan bottom-tabs).

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <SafeAreaView edges={['top', 'left', 'right']}>
        <AcademyHeader
          initial={initial}
          onAvatarPress={() => navigation.navigate(ROUTES.profile)}
        />
      </SafeAreaView>
      <Tab.Navigator
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBar={tabBarProps => <AcademyTabBar {...tabBarProps} />}
        screenOptions={{ headerShown: false, sceneStyle: styles.scene }}>
        <Tab.Screen
          name={ROUTES.academyBeranda}
          component={AcademyBerandaScreen}
          options={{ title: 'Beranda' }}
        />
        <Tab.Screen
          name={ROUTES.academyAkademik}
          component={AcademyAkademikScreen}
          options={{ title: 'Akademik' }}
        />
        <Tab.Screen
          name={ROUTES.academyPsikologi}
          component={AcademyPsikologiScreen}
          options={{ title: 'Psikologi' }}
        />
        <Tab.Screen
          name={ROUTES.academyJasmani}
          component={AcademyJasmaniScreen}
          options={{ title: 'Jasmani' }}
        />
        <Tab.Screen
          name={ROUTES.academyRiwayat}
          component={AcademyRiwayatScreen}
          options={{ title: 'Riwayat' }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scene: {
    backgroundColor: 'transparent',
  },
});
