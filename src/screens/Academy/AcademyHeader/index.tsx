import { Image, StyleSheet, Text, View } from 'react-native';

import { logo } from '@/assets';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';

export interface AcademyHeaderProps {
  /** Inisial avatar (huruf pertama nama). */
  initial: string;
  onAvatarPress: () => void;
}

// Chrome tetap untuk seluruh sub-app Academy — persis artboard "Academy — Beranda": logo + wordmark
// "Cigra Academy" + avatar gradient. Bukan `HomeHeader` (tak ada lonceng / sapaan) dan tanpa tombol
// kembali — keluar dari Academy lewat gestur back (Android: ketuk 2x, lihat AcademyTabNavigator).
export default function AcademyHeader(props: AcademyHeaderProps) {
  const { initial, onAvatarPress } = props;

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Image source={logo.LogoIcon} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brandText}>
          <Text style={styles.brandDark}>Cigra</Text>
          <Text style={styles.brandAccent}> Academy</Text>
        </Text>
      </View>
      <PressableScale
        onPress={onAvatarPress}
        accessibilityRole="button"
        accessibilityLabel="Profil">
        <GradientAvatar
          label={initial}
          gradientStart={colors.gradientPrimaryStart}
          gradientEnd={colors.gradientPrimaryEnd}
          size={36}
        />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 30,
    height: 30,
  },
  brandText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandDark: {
    color: colors.heading,
  },
  brandAccent: {
    color: colors.primary,
  },
});
