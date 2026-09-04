import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { MotiView } from 'moti';

import type { IconName } from '@/components/atoms/Icon';
import StatusModal from '@/components/organisms/StatusModal';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import AcademyHero from '@/screens/Academy/shared/AcademyHero';
import AcademyListCard from '@/screens/Academy/shared/AcademyListCard';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

interface TestGroup {
  key: string;
  icon: IconName;
  gradientStart: string;
  gradientEnd: string;
  title: string;
  subtitle: string;
  /** Jumlah tes tersedia — semua 0 untuk sekarang (belum ada bank soal Psikologi). */
  count: number | null;
}

// Data DUMMY — kelompok tes Psikologi (artboard "Academy — Psikologi"). Semua "0 tes tersedia"
// sampai bank soal / endpoint-nya ada. Kartu apa pun yang diketuk memunculkan "Segera Hadir".
const GROUPS: TestGroup[] = [
  {
    key: 'inteligensi',
    icon: 'bulb',
    gradientStart: colors.gradientEntryStart, // #F59E0B → #F97316 (jingga)
    gradientEnd: colors.academyAkademikStart,
    title: 'Inteligensi',
    subtitle: 'Tes kemampuan kognitif & penalaran',
    count: 0,
  },
  {
    key: 'kepribadian',
    icon: 'heart',
    gradientStart: colors.academyAkademikEnd, // #EC4899 → #A855F7 (pink→ungu)
    gradientEnd: colors.academyPsiKepribadianEnd,
    title: 'Kepribadian',
    subtitle: 'Profil karakter, perilaku & kesehatan jiwa',
    count: 0,
  },
  {
    key: 'sikap-kerja',
    icon: 'briefcase',
    gradientStart: colors.academyPsiSikapStart, // #14B8A6 → #0D9488 (teal)
    gradientEnd: colors.academyPsiSikapEnd,
    title: 'Sikap Kerja',
    subtitle: 'Ketelitian, kecepatan, stabilitas & daya tahan kerja',
    count: 0,
  },
  {
    key: 'rapor',
    icon: 'history',
    gradientStart: colors.academyPsiRaporStart, // #A9B4C4 → #7C8AA0 (abu)
    gradientEnd: colors.academyPsiRaporEnd,
    title: 'Rapor Psikologi',
    subtitle: 'Kecermatan, psikotes berskor, dan profil kepribadian terangkum',
    count: null,
  },
];

export default function AcademyPsikologiScreen() {
  const bottomPadding = useTabScreenBottomPadding();
  const [soonTitle, setSoonTitle] = useState<string | null>(null);

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
          icon="brain"
          glow={colors.academyHeroGlow}
          iconGradientStart={colors.gradientWeaponStart}
          iconGradientEnd={colors.gradientWeaponEnd}
          kicker="3 KELOMPOK TES"
          title="Persiapan Psikotes TNI/POLRI/Kedinasan"
          subtitle="Pilih kelompok tes — hasil tersimpan di Riwayat."
        />

        {GROUPS.map(group => (
          <AcademyListCard
            key={group.key}
            icon={group.icon}
            gradientStart={group.gradientStart}
            gradientEnd={group.gradientEnd}
            title={group.title}
            subtitle={group.subtitle}
            meta={group.count === null ? undefined : `${group.count} tes tersedia`}
            onPress={() => setSoonTitle(group.title)}
          />
        ))}
      </MotiView>

      <StatusModal
        visible={soonTitle !== null}
        variant="success"
        icon="clock"
        title="Segera Hadir"
        message={`${soonTitle ?? 'Bagian ini'} sedang kami siapkan dan akan tersedia dalam waktu dekat.`}
        primaryAction={{ label: 'Mengerti', onPress: () => setSoonTitle(null) }}
        onRequestClose={() => setSoonTitle(null)}
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
