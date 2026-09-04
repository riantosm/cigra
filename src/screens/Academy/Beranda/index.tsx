import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import GradientIconBadge from '@/components/molecules/GradientIconBadge';
import MenuCard from '@/components/molecules/MenuCard';
import { useDoubleBackToExit } from '@/hooks/useDoubleBackToExit';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { ROUTES } from '@/navigation/paths';
import type { AcademyTabParamList, AcademyTabScreenProps } from '@/navigation/types';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { cleanValue } from '@/utils/format';
import { contentEnterTransition } from '@/utils/motion';

export type AcademyBerandaScreenProps = AcademyTabScreenProps<typeof ROUTES.academyBeranda>;

interface HeroStat {
  key: string;
  icon: IconName;
  iconColor: string;
  label: string;
  value: string;
}

interface AcademyMenu {
  key: string;
  icon: IconName;
  gradientStart: string;
  gradientEnd: string;
  title: string;
  subtitle: string;
  target: keyof AcademyTabParamList;
}

const HERO_STATS: HeroStat[] = [
  { key: 'activity', icon: 'clock', iconColor: colors.academyStatActivity, label: 'Aktivitas', value: '0×' },
  { key: 'score', icon: 'bar-chart', iconColor: colors.academyStatScore, label: 'Avg Skor', value: '0' },
  { key: 'tryout', icon: 'calendar', iconColor: colors.academyStatTryout, label: 'Tryout', value: '0' },
];

const MENU: AcademyMenu[] = [
  {
    key: 'akademik',
    icon: 'academy',
    gradientStart: colors.gradientEntryStart,
    gradientEnd: colors.gradientEntryEnd,
    title: 'Akademik',
    subtitle: 'Tryout · Latihan Soal · TKD · TPA · Pelajaran',
    target: ROUTES.academyAkademik,
  },
  {
    key: 'psikologi',
    icon: 'brain',
    gradientStart: colors.gradientWeaponStart,
    gradientEnd: colors.gradientWeaponEnd,
    title: 'Psikologi',
    subtitle: 'Kepribadian · Sikap Kerja · MMPI · Pauli · Kecermatan',
    target: ROUTES.academyPsikologi,
  },
  {
    key: 'jasmani',
    icon: 'heartbeat',
    gradientStart: colors.gradientHealthStart,
    gradientEnd: colors.gradientHealthEnd,
    title: 'Jasmani',
    subtitle: 'Garjas · Renang · Postur · VO2Max · Zona Latihan',
    target: ROUTES.academyJasmani,
  },
  {
    key: 'riwayat',
    icon: 'history',
    gradientStart: colors.gradientPrimaryStart,
    gradientEnd: colors.gradientPrimaryEnd,
    title: 'Riwayat',
    subtitle: 'Semua hasil tes dalam satu tempat',
    target: ROUTES.academyRiwayat,
  },
];

export default function AcademyBerandaScreen(props: AcademyBerandaScreenProps) {
  const { navigation } = props;
  const user = useAppSelector(state => state.auth.user);
  const bottomPadding = useTabScreenBottomPadding();

  // Sama seperti Home di app utama: back pertama menampilkan toast, back kedua dalam 2 detik
  // keluar dari Academy (pop `AcademyRoot` → kembali ke app utama). Ditaruh di Beranda saja —
  // dari tab lain, bottom-tabs lebih dulu mengembalikan ke Beranda (perilaku bawaan).
  useDoubleBackToExit(
    'Tekan sekali lagi untuk keluar dari Academy',
    // GO_BACK dari tab pertama tidak ditangani bottom-tabs → naik ke root stack → pop `AcademyRoot`.
    useCallback(() => navigation.goBack(), [navigation]),
  );

  const fullName =
    cleanValue(user?.personnel?.full_name) ?? cleanValue(user?.name) ?? 'Prajurit';
  const firstName = fullName.split(' ')[0];

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}>
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={contentEnterTransition}>
        <View style={styles.hero}>
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <RadialGradient id="academyHeroGlow" cx="85%" cy="0%" r="90%">
                <Stop offset="0" stopColor={colors.academyHeroGlow} />
                <Stop offset="0.55" stopColor={colors.academyHeroGlow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#academyHeroGlow)" />
          </Svg>

          <View style={styles.heroTop}>
            <GradientIconBadge
              icon="academy"
              gradientStart={colors.gradientFamilyStart}
              gradientEnd={colors.gradientWeaponStart}
              size={44}
            />
            <View style={styles.heroTitleGroup}>
              <Text style={styles.heroKicker}>BERANDA</Text>
              <Text style={styles.heroTitle} numberOfLines={1}>
                Halo, {firstName}
              </Text>
            </View>
          </View>

          <Text style={styles.heroBody}>Siap latihan hari ini? Pilih modul untuk mulai.</Text>

          <View style={styles.heroStats}>
            {HERO_STATS.map(stat => (
              <View key={stat.key} style={styles.statTile}>
                <View style={styles.statLabelRow}>
                  <Icon name={stat.icon} size={13} color={stat.iconColor} />
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Menu Utama</Text>

        <View style={styles.grid}>
          {MENU.map(item => (
            <MenuCard
              key={item.key}
              icon={item.icon}
              gradientStart={item.gradientStart}
              gradientEnd={item.gradientEnd}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => navigation.navigate(item.target)}
              style={styles.gridCell}
            />
          ))}
        </View>
      </MotiView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  hero: {
    borderRadius: 22,
    padding: 18,
    gap: 12,
    overflow: 'hidden',
    backgroundColor: colors.academyHeroSurface,
    shadowColor: colors.academyHeroSurface,
    shadowOpacity: 0.32,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroTitleGroup: {
    flex: 1,
    minWidth: 0,
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.academyHeroLabel,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.primaryForeground,
  },
  heroBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.academyHeroBody,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
  },
  statTile: {
    flex: 1,
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: colors.academyHeroTileSurface,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.academyHeroTileLabel,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCell: {
    width: '47%',
    flexGrow: 1,
  },
});
