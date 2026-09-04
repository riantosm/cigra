import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MotiView } from 'moti';

import StatusModal from '@/components/organisms/StatusModal';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { ROUTES } from '@/navigation/paths';
import type { AcademyTabScreenProps, RootStackParamList } from '@/navigation/types';
import AcademyHero from '@/screens/Academy/shared/AcademyHero';
import AcademyListCard from '@/screens/Academy/shared/AcademyListCard';
import { TKD_MODULES } from '@/screens/Academy/tkd/data';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

type AkademikNav = CompositeNavigationProp<
  AcademyTabScreenProps<typeof ROUTES.academyAkademik>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

const availableModules = TKD_MODULES.filter(m => !m.locked).length;

export default function AcademyAkademikScreen() {
  const navigation = useNavigation<AkademikNav>();
  const bottomPadding = useTabScreenBottomPadding();
  const [raporSoon, setRaporSoon] = useState(false);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}>
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={contentEnterTransition}
        style={styles.stack}>
        <AcademyHero
          icon="academy"
          kicker="1 JALUR PROGRAM"
          title="Akademik"
          subtitle="Pilih jalur program persiapan seleksimu."
        />

        <AcademyListCard
          icon="bank"
          gradientStart={colors.academyAkademikStart}
          gradientEnd={colors.academyAkademikEnd}
          title="TKD — Tes Kompetensi Dasar"
          subtitle={`${availableModules} modul · tiap modul berisi TWK + TIU + TKP`}
          onPress={() => navigation.navigate(ROUTES.academyTkdList)}
        />

        <AcademyListCard
          icon="medal"
          gradientStart={colors.gradientPrimaryStart}
          gradientEnd={colors.gradientWeaponStart}
          title="Rapor Akademik"
          subtitle="Rapor & pembahasanmu tampil di sini"
          onPress={() => setRaporSoon(true)}
        />
      </MotiView>

      <StatusModal
        visible={raporSoon}
        variant="success"
        icon="clock"
        title="Segera Hadir"
        message="Rapor Akademik akan tampil di sini setelah kamu menyelesaikan beberapa tryout."
        primaryAction={{ label: 'Mengerti', onPress: () => setRaporSoon(false) }}
        onRequestClose={() => setRaporSoon(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  stack: {
    gap: 12,
  },
});
