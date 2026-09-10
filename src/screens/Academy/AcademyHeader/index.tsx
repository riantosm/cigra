import { Image, StyleSheet, Text, View } from 'react-native';

import { logo } from '@/assets';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { smallButtonShadow } from '@/theme/shadows';

export interface AcademyHeaderProps {
  subtitle: string;
  initial: string;
  onAvatarPress: () => void;
}

// Chrome tetap Smart Academy (di atas bottom-tab per peran) — logo + wordmark + subtitle peran +
// avatar → Profile. Tanpa tombol back (keluar Academy lewat back Android dari tab pertama).
export default function AcademyHeader(props: AcademyHeaderProps) {
  const { subtitle, initial, onAvatarPress } = props;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.logoBadge}>
          <Image source={logo.LogoIcon} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>
            <Text style={styles.titleStrong}>Smart</Text> Academy
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
      <PressableScale onPress={onAvatarPress} contentStyle={styles.avatar} accessibilityLabel="Profil">
        <Text style={styles.avatarText}>{initial}</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    ...smallButtonShadow,
  },
  logo: { width: '100%', height: '100%' },
  titleGroup: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.heading, letterSpacing: -0.2 },
  titleStrong: { fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.primaryForeground },
});
