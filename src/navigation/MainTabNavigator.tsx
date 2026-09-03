import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ROUTES } from '@/navigation/paths';
import { TAB_BAR_HEIGHT } from '@/navigation/tabBar';
import CustomTabBar from '@/navigation/CustomTabBar';
import type { MainTabParamList } from '@/navigation/types';
import StatusModal from '@/components/organisms/StatusModal';
import AcademyScreen from '@/screens/Academy';
import BukuSakuScreen from '@/screens/BukuSaku';
import EmergencyScreen from '@/screens/Emergency';
import HomeScreen from '@/screens/Home';
import RiwayatScreen from '@/screens/Riwayat';
import { colors } from '@/theme/colors';
import { pressTransition } from '@/utils/motion';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  // Owned here, not inside EmergencyTabButton: that button lives inside a `flex: 1` tab-bar slot
  // roughly 1/5 of the screen wide, and an absolutely positioned view with no explicit width
  // nested in there gets its width clamped to that narrow slot on Android instead of sizing to
  // its own text. Rendering the toast as a sibling of <Tab.Navigator> gives it the full screen
  // width to size against. (An earlier attempt used a Modal for the same reason, but Android
  // Dialogs intercept touches for the whole screen while visible, blocking further taps on the
  // button underneath — a plain absolutely positioned, pointerEvents="none" view doesn't.)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Tab "Academy" belum aktif — tap-nya memunculkan popup ini alih-alih pindah tab.
  const [isAcademyComingSoon, setIsAcademyComingSoon] = useState(false);

  return (
    <View style={styles.root}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        // react-navigation's documented `tabBar` render-prop — not a component defined during render.
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBar={props => (
          <CustomTabBar
            {...props}
            onEmergencyToastChange={setToastMessage}
            onAcademyPress={() => setIsAcademyComingSoon(true)}
          />
        )}>
        <Tab.Screen name={ROUTES.home} component={HomeScreen} options={{ title: 'Home' }} />
        <Tab.Screen name={ROUTES.riwayat} component={RiwayatScreen} options={{ title: 'Riwayat' }} />
        <Tab.Screen name={ROUTES.emergency} component={EmergencyScreen} options={{ title: 'Emergency' }} />
        <Tab.Screen name={ROUTES.bukuSaku} component={BukuSakuScreen} options={{ title: 'Buku Saku' }} />
        <Tab.Screen name={ROUTES.academy} component={AcademyScreen} options={{ title: 'Academy' }} />
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

      <StatusModal
        visible={isAcademyComingSoon}
        variant="success"
        icon="clock"
        title="Segera Hadir"
        message="Fitur Academy sedang kami siapkan dan akan tersedia dalam waktu dekat."
        primaryAction={{ label: 'Mengerti', onPress: () => setIsAcademyComingSoon(false) }}
        onRequestClose={() => setIsAcademyComingSoon(false)}
      />
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
