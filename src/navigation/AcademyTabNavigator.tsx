import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenBackground from '@/components/atoms/ScreenBackground';
import AcademyTabBar from '@/navigation/AcademyTabBar';
import { ROUTES } from '@/navigation/paths';
import type { AcademyTabParamList, RootStackScreenProps } from '@/navigation/types';
import AcademyHeader from '@/screens/Academy/AcademyHeader';
import AcademyMemberHome from '@/screens/Academy/AcademyMemberHome';
import AcademyInstructorHome from '@/screens/Academy/AcademyInstructorHome';
import AcademyCommanderOverview from '@/screens/Academy/AcademyCommanderOverview';
import AcademyProgramsTab from '@/screens/Academy/AcademyProgramsTab';
import AcademyResults from '@/screens/Academy/AcademyResults';
import AcademyCompetencies from '@/screens/Academy/AcademyCompetencies';
import AcademyInsVerifications from '@/screens/Academy/AcademyInsVerifications';
import { academyPovFor } from '@/screens/Academy/shared/roles';
import { useAppSelector } from '@/store/hooks';
import { cleanValue } from '@/utils/format';

const Tab = createBottomTabNavigator<AcademyTabParamList>();

type Props = RootStackScreenProps<typeof ROUTES.academyRoot>;

// Smart Academy = "sub-app": bottom-tab navigator yang set tab-nya menyesuaikan peran user
// (brief §5). Chrome tetap `AcademyHeader`. Di-push dari tab "Academy" bar utama.
export default function AcademyTabNavigator(props: Props) {
  const { navigation } = props;
  const user = useAppSelector(state => state.auth.user);
  const pov = academyPovFor(user?.roles);

  const fullName = cleanValue(user?.personnel?.full_name) ?? cleanValue(user?.name) ?? 'Prajurit';
  const subtitle =
    pov === 'commander'
      ? 'Komandan · monitoring'
      : pov === 'instructor'
        ? `Instruktur · ${fullName}`
        : fullName;

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <SafeAreaView edges={['top', 'left', 'right']}>
        <AcademyHeader
          subtitle={subtitle}
          initial={fullName.charAt(0).toUpperCase()}
          onAvatarPress={() => navigation.navigate(ROUTES.profile)}
        />
      </SafeAreaView>
      <Tab.Navigator
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBar={tabBarProps => <AcademyTabBar {...tabBarProps} />}
        screenOptions={{ headerShown: false, sceneStyle: styles.scene }}>
        {pov === 'commander' ? (
          <>
            <Tab.Screen
              name={ROUTES.academyTabHome}
              component={AcademyCommanderOverview}
              options={{ title: 'Overview' }}
            />
            <Tab.Screen name={ROUTES.academyTabPrograms} options={{ title: 'Program' }}>
              {() => <AcademyProgramsTab pov="commander" />}
            </Tab.Screen>
          </>
        ) : pov === 'instructor' ? (
          <>
            <Tab.Screen
              name={ROUTES.academyTabHome}
              component={AcademyInstructorHome}
              options={{ title: 'Home' }}
            />
            <Tab.Screen name={ROUTES.academyTabPrograms} options={{ title: 'Program Saya' }}>
              {() => <AcademyProgramsTab pov="instructor" />}
            </Tab.Screen>
            <Tab.Screen
              name={ROUTES.academyTabVerifications}
              component={AcademyInsVerifications}
              options={{ title: 'Verifikasi' }}
            />
          </>
        ) : (
          <>
            <Tab.Screen
              name={ROUTES.academyTabHome}
              component={AcademyMemberHome}
              options={{ title: 'Home' }}
            />
            <Tab.Screen name={ROUTES.academyTabPrograms} options={{ title: 'Program Saya' }}>
              {() => <AcademyProgramsTab pov="my" />}
            </Tab.Screen>
            <Tab.Screen
              name={ROUTES.academyTabResults}
              component={AcademyResults}
              options={{ title: 'Hasil' }}
            />
            <Tab.Screen
              name={ROUTES.academyTabCompetencies}
              component={AcademyCompetencies}
              options={{ title: 'Kemampuan' }}
            />
          </>
        )}
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scene: { backgroundColor: 'transparent' },
});
