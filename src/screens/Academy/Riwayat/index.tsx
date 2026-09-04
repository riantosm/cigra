import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { MotiView } from 'moti';

import PressableScale from '@/components/atoms/PressableScale';
import StatusModal from '@/components/organisms/StatusModal';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { ROUTES } from '@/navigation/paths';
import type { AcademyTabParamList, AcademyTabScreenProps } from '@/navigation/types';
import AcademyHero from '@/screens/Academy/shared/AcademyHero';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import { contentEnterTransition } from '@/utils/motion';

export type AcademyRiwayatScreenProps = AcademyTabScreenProps<typeof ROUTES.academyRiwayat>;

type Category = 'akademik' | 'psikologi' | 'jasmani';

const TABS: {
  key: Category;
  label: string;
  emptyText: string;
  target: keyof AcademyTabParamList;
}[] = [
  {
    key: 'akademik',
    label: 'Akademik',
    emptyText: 'Belum ada pengerjaan modul akademik.',
    target: ROUTES.academyAkademik,
  },
  {
    key: 'psikologi',
    label: 'Psikologi',
    emptyText: 'Belum ada pengerjaan tes psikologi.',
    target: ROUTES.academyPsikologi,
  },
  {
    key: 'jasmani',
    label: 'Jasmani',
    emptyText: 'Belum ada latihan atau pengukuran jasmani.',
    target: ROUTES.academyJasmani,
  },
];

export default function AcademyRiwayatScreen(props: AcademyRiwayatScreenProps) {
  const { navigation } = props;
  const bottomPadding = useTabScreenBottomPadding();
  const [active, setActive] = useState<Category>('akademik');
  const [raporSoon, setRaporSoon] = useState(false);

  const current = TABS.find(t => t.key === active) ?? TABS[0];

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
          icon="history"
          surface={colors.academyRiwayatHeroSurface}
          glow={colors.academyRiwayatGlow}
          iconGradientStart={colors.gradientFamilyStart}
          iconGradientEnd={colors.gradientFamilyEnd}
          kicker="BELUM ADA HASIL"
          title="Riwayat Belajarmu"
          subtitle="Kerjakan tes pertamamu — hasilnya otomatis tersimpan di sini."
        />

        <View style={styles.segment}>
          {TABS.map(tab => {
            const on = tab.key === active;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActive(tab.key)}
                style={[styles.segmentItem, on && styles.segmentItemOn]}
                accessibilityRole="button"
                accessibilityState={on ? { selected: true } : {}}>
                {on ? (
                  <Svg style={StyleSheet.absoluteFill}>
                    <Defs>
                      <LinearGradient id={`riwSeg-${tab.key}`} x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={colors.academyAkademikStart} />
                        <Stop offset="1" stopColor={colors.academyAkademikEnd} />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill={`url(#riwSeg-${tab.key})`} />
                  </Svg>
                ) : null}
                <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                  {tab.label} (0)
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.linkRow}>
          <PressableScale onPress={() => setRaporSoon(true)}>
            <Text style={styles.link}>Lihat Rapor Lengkap →</Text>
          </PressableScale>
        </View>

        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{current.emptyText}</Text>
          <PressableScale onPress={() => navigation.navigate(current.target)}>
            <Text style={styles.emptyCta}>Mulai Belajar →</Text>
          </PressableScale>
        </View>
      </MotiView>

      <StatusModal
        visible={raporSoon}
        variant="success"
        icon="clock"
        title="Segera Hadir"
        message="Rapor lengkap Academy sedang kami siapkan dan akan tersedia dalam waktu dekat."
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
  segment: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
  },
  segmentItem: {
    flex: 1,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  segmentItemOn: {
    backgroundColor: colors.academyAkademikEnd,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextOn: {
    color: colors.primaryForeground,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
    marginTop: -2,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyCard: {
    paddingVertical: 28,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    gap: 10,
    ...cardShadow,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyCta: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
