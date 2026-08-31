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

type LainnyaNavigationProp = CompositeNavigationProp<
  MainTabScreenProps<'Lainnya'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

export interface LainnyaScreenProps {
  navigation: LainnyaNavigationProp;
}

export default function LainnyaScreen(props: LainnyaScreenProps) {
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
            icon="grid"
            title="Lainnya"
            message="Belum ada konten lainnya saat ini"
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
