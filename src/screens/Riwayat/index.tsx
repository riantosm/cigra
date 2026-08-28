import { ScrollView, StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';

import MainLayout from '@/components/templates/MainLayout';
import MenuCard from '@/components/molecules/MenuCard';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

const menuItems = [
  {
    key: 'entry-exit',
    icon: 'entry-exit',
    title: 'Keluar Masuk',
    subtitle: 'Riwayat keluar masuk area',
    gradientStart: colors.gradientEntryStart,
    gradientEnd: colors.gradientEntryEnd,
  },
  {
    key: 'weapon',
    icon: 'weapon',
    title: 'Peminjaman Senjata',
    subtitle: 'Riwayat peminjaman & pengembalian senjata',
    gradientStart: colors.gradientWeaponStart,
    gradientEnd: colors.gradientWeaponEnd,
  },
  {
    key: 'health',
    icon: 'heartbeat',
    title: 'Kesehatan',
    subtitle: 'Riwayat pemeriksaan kesehatan',
    gradientStart: colors.gradientHealthStart,
    gradientEnd: colors.gradientHealthEnd,
  },
] as const;

export default function RiwayatScreen() {
  return (
    <MainLayout title="Riwayat">
      <ScrollView contentContainerStyle={styles.container}>
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}
          style={styles.grid}>
          {menuItems.map(item => (
            <View key={item.key} style={styles.gridItem}>
              <MenuCard
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                gradientStart={item.gradientStart}
                gradientEnd={item.gradientEnd}
              />
            </View>
          ))}
        </MotiView>
      </ScrollView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 96,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    width: '47%',
  },
});
