import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import type { IconName } from '@/components/atoms/Icon';
import StatusModal from '@/components/organisms/StatusModal';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import AcademyHero from '@/screens/Academy/shared/AcademyHero';
import AcademyListCard from '@/screens/Academy/shared/AcademyListCard';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

interface JasmaniItem {
  key: string;
  icon: IconName;
  gradientStart: string;
  gradientEnd: string;
  title: string;
  subtitle: string;
}

interface JasmaniSection {
  label: string;
  items: JasmaniItem[];
}

// Data DUMMY — alat ukur & perencana latihan Jasmani (artboard "Academy — Jasmani"). Belum ada
// kalkulator/endpoint-nya; setiap kartu memunculkan "Segera Hadir".
const SECTIONS: JasmaniSection[] = [
  {
    label: 'Tes & Ukur',
    items: [
      {
        key: 'hitung-garjas',
        icon: 'sliders',
        gradientStart: colors.academyAccentRose,
        gradientEnd: colors.academyAkademikEnd,
        title: 'Hitung Garjas',
        subtitle: 'Hitung nilai kelima sub-tes sekaligus nilai akhirnya',
      },
      {
        key: 'hitung-renang',
        icon: 'waves',
        gradientStart: colors.gradientPrimaryStart,
        gradientEnd: colors.academyAccentCyan,
        title: 'Hitung Renang',
        subtitle: 'Hitung nilai renang 50 meter sesuai kelompok umur',
      },
      {
        key: 'imt-postur',
        icon: 'ruler',
        gradientStart: colors.gradientEntryStart,
        gradientEnd: colors.academyAkademikStart,
        title: 'IMT & Postur',
        subtitle: 'Cek berat badan idealmu berdasarkan tinggi dan usia',
      },
    ],
  },
  {
    label: 'Perencana Target',
    items: [
      {
        key: 'target-garjas',
        icon: 'target',
        gradientStart: colors.gradientWeaponStart,
        gradientEnd: colors.academyAccentIndigo,
        title: 'Target Garjas',
        subtitle: 'Susun rencana mengejar skor lari dan nilai total impianmu',
      },
      {
        key: 'target-lari',
        icon: 'run',
        gradientStart: colors.gradientHealthStart,
        gradientEnd: colors.academyAccentGreen,
        title: 'Target Lari',
        subtitle: 'Hitung tempo lari dan perkiraan waktu untuk jarak lain',
      },
      {
        key: 'zona-lari',
        icon: 'heart-pulse',
        gradientStart: colors.gradientFamilyStart,
        gradientEnd: colors.academyAccentRose,
        title: 'Zona Lari',
        subtitle: 'Cari zona denyut jantung latihan yang pas untuk usiamu',
      },
      {
        key: 'target-push-up',
        icon: 'trending-up',
        gradientStart: colors.gradientEntryStart,
        gradientEnd: colors.academyAccentOrangeDeep,
        title: 'Target Push Up',
        subtitle: 'Program latihan bertahap menuju target push up-mu',
      },
      {
        key: 'target-pull-up',
        icon: 'arrow-up',
        gradientStart: colors.academyAccentIndigo,
        gradientEnd: colors.gradientWeaponEnd,
        title: 'Target Pull Up',
        subtitle: 'Program latihan bertahap, termasuk panduan untuk pemula',
      },
      {
        key: 'rapor-jasmani',
        icon: 'history',
        gradientStart: colors.academyPsiRaporStart,
        gradientEnd: colors.academyPsiRaporEnd,
        title: 'Rapor Jasmani',
        subtitle: 'Perkembangan tiap sub-tes plus saran latihan berikutnya',
      },
    ],
  },
];

export default function AcademyJasmaniScreen() {
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
          icon="heartbeat"
          surface={colors.academyJasmaniHeroSurface}
          glow={colors.academyJasmaniGlow}
          iconGradientStart={colors.gradientHealthStart}
          iconGradientEnd={colors.gradientHealthEnd}
          kicker="8 ALAT UKUR & LATIHAN"
          title="Kesamaptaan Jasmani"
          subtitle="Ukur dulu, lalu susun targetnya — hasilnya masuk ke Rapor Jasmani."
        />

        {SECTIONS.map(section => (
          <View key={section.label} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.label.toUpperCase()}</Text>
            {section.items.map(item => (
              <AcademyListCard
                key={item.key}
                icon={item.icon}
                gradientStart={item.gradientStart}
                gradientEnd={item.gradientEnd}
                title={item.title}
                subtitle={item.subtitle}
                onPress={() => setSoonTitle(item.title)}
              />
            ))}
          </View>
        ))}
      </MotiView>

      <StatusModal
        visible={soonTitle !== null}
        variant="success"
        icon="clock"
        title="Segera Hadir"
        message={`${soonTitle ?? 'Fitur ini'} sedang kami siapkan dan akan tersedia dalam waktu dekat.`}
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
    gap: 10,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 2,
    marginLeft: 2,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.placeholder,
  },
});
