import { StyleSheet, Text, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import ScreenBackground from '@/components/atoms/ScreenBackground';
import EmptyState from '@/components/molecules/EmptyState';
import MenuCard from '@/components/molecules/MenuCard';
import HomeHeader from '@/screens/Home/HomeHeader';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { ROUTES } from '@/navigation/paths';
import type { MainTabScreenProps, RootStackParamList } from '@/navigation/types';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

type RiwayatNavigationProp = CompositeNavigationProp<
  MainTabScreenProps<'Riwayat'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

export interface RiwayatScreenProps {
  navigation: RiwayatNavigationProp;
}

// Tab "Riwayat" untuk anggota = hub menu. Sekarang baru ada "Kesehatan" (GET /health/my);
// menu lain (mis. Keluar Masuk, Peminjaman Senjata) menyusul begitu endpoint-nya siap —
// tinggal tambah entri ke `menuItems`. Role tanpa record personel (mis. petugas_kesehatan)
// melihat placeholder karena `/health/my` khusus anggota/prajurit.
export default function RiwayatScreen(props: RiwayatScreenProps) {
  const { navigation } = props;
  const user = useAppSelector(state => state.auth.user);
  const bottomPadding = useTabScreenBottomPadding();

  const roles = user?.roles ?? [];
  const isMember = Boolean(user?.personnel) && !roles.includes('petugas_kesehatan');

  const menuItems = [
    {
      key: 'kesehatan',
      icon: 'heartbeat' as const,
      gradientStart: colors.gradientHealthStart,
      gradientEnd: colors.gradientHealthEnd,
      title: 'Kesehatan',
      subtitle: 'Riwayat pemeriksaan kesehatan Anda',
      onPress: () => navigation.navigate(ROUTES.healthMyHistory),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenBackground />
      <HomeHeader
        user={user}
        onAvatarPress={() => navigation.navigate(ROUTES.profile)}
        onBellPress={() => navigation.navigate(ROUTES.notifications)}
      />

      {!isMember ? (
        <View style={[styles.emptyState, { paddingBottom: bottomPadding }]}>
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={contentEnterTransition}>
            <EmptyState
              icon="history"
              title="Riwayat"
              message="Belum ada konten riwayat saat ini"
            />
          </MotiView>
        </View>
      ) : (
        <View style={[styles.content, { paddingBottom: bottomPadding }]}>
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={contentEnterTransition}>
            <Text style={styles.heading}>Riwayat</Text>
            <Text style={styles.subheading}>Pilih kategori riwayat yang ingin dilihat</Text>
            <View style={styles.grid}>
              {menuItems.map(item => (
                <MenuCard
                  key={item.key}
                  icon={item.icon}
                  gradientStart={item.gradientStart}
                  gradientEnd={item.gradientEnd}
                  title={item.title}
                  subtitle={item.subtitle}
                  onPress={item.onPress}
                  style={styles.gridCell}
                />
              ))}
            </View>
          </MotiView>
        </View>
      )}
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.heading,
  },
  subheading: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // Dua kolom: (100% - gap) / 2. `MenuCard` sudah punya style kartunya sendiri.
  gridCell: {
    width: '47%',
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
