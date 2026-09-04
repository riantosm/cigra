import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { IconName } from '@/components/atoms/Icon';
import GradientIconBadge from '@/components/molecules/GradientIconBadge';
import { colors } from '@/theme/colors';

export interface AcademyHeroProps {
  icon: IconName;
  kicker: string;
  title: string;
  subtitle: string;
  /** Warna semburat radial di pojok atas hero gelap. Default: merah (alur Akademik). */
  glow?: string;
  /** Warna permukaan hero gelap. Default: `academyHeroSurface` (ungu-gelap). */
  surface?: string;
  /** Gradient icon-badge. Default: jingga→pink (alur Akademik). */
  iconGradientStart?: string;
  iconGradientEnd?: string;
}

// Kartu "hero" gelap untuk halaman-halaman grup Academy (artboard "Academy — Akademik / Psikologi …"):
// permukaan gelap `academyHeroSurface` + semburat radial + ikon-badge gradient + kicker/judul/subjudul.
export default function AcademyHero(props: AcademyHeroProps) {
  const {
    icon,
    kicker,
    title,
    subtitle,
    glow = colors.academyAkademikGlow,
    surface = colors.academyHeroSurface,
    iconGradientStart = colors.academyAkademikStart,
    iconGradientEnd = colors.academyAkademikEnd,
  } = props;
  const gradientId = `heroGlow-${glow}`.replace(/[^a-zA-Z0-9-]/g, '');

  return (
    <View style={[styles.hero, { backgroundColor: surface, shadowColor: surface }]}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id={gradientId} cx="84%" cy="0%" r="95%">
            <Stop offset="0" stopColor={glow} />
            <Stop offset="0.55" stopColor={glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>

      <View style={styles.row}>
        <GradientIconBadge
          icon={icon}
          gradientStart={iconGradientStart}
          gradientEnd={iconGradientEnd}
          size={50}
        />
        <View style={styles.textGroup}>
          <Text style={styles.kicker}>{kicker}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.academyHeroLabel,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.primaryForeground,
    lineHeight: 25,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.academyHeroBody,
  },
});
