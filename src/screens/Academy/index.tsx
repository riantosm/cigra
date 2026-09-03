import { StyleSheet, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import ScreenBackground from '@/components/atoms/ScreenBackground';
import EmptyState from '@/components/molecules/EmptyState';
import HomeHeader from '@/screens/Home/HomeHeader';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { ROUTES } from '@/navigation/paths';
import type { MainTabScreenProps, RootStackParamList } from '@/navigation/types';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

type AcademyNavigationProp = CompositeNavigationProp<
  MainTabScreenProps<'Academy'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

export interface AcademyScreenProps {
  navigation: AcademyNavigationProp;
}

// Tab "Academy" belum bisa dibuka — CustomTabBar menahan tap-nya dan memunculkan popup
// "Segera Hadir" (lihat MainTabNavigator), jadi layar ini praktis tidak pernah tampil.
// Tetap dipertahankan sebagai komponen Tab.Screen + placeholder kalau nanti dibuka lagi.
export default function AcademyScreen(props: AcademyScreenProps) {
  const { navigation } = props;
  const user = useAppSelector(state => state.auth.user);
  const bottomPadding = useTabScreenBottomPadding();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenBackground />
      <HomeHeader
        user={user}
        onAvatarPress={() => navigation.navigate(ROUTES.profile)}
        onBellPress={() => navigation.navigate(ROUTES.notifications)}
      />
      <View style={[styles.content, { paddingBottom: bottomPadding }]}>
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}>
          <EmptyState
            icon="academy"
            title="Academy"
            message="Fitur Academy segera hadir"
          />
        </MotiView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageGradientStart,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
