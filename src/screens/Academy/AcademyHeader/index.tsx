import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { logo } from '@/assets';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import { colors } from '@/theme/colors';
import { smallButtonShadow } from '@/theme/shadows';
import { isDisplayablePhoto } from '@/utils/avatar';

export interface AcademyHeaderProps {
  subtitle: string;
  // Sumber avatar sama seperti `HomeHeader` — foto asli (`personnel.photo`) kalau ada &
  // bisa ditampilkan, jatuh ke inisial dari `personnel.full_name` kalau tidak.
  fullName: string;
  photoPath?: string | null;
  onAvatarPress: () => void;
}

// Chrome tetap Smart Academy (di atas bottom-tab per peran) — logo + wordmark + subtitle peran +
// avatar → Profile. Tanpa tombol back (keluar Academy lewat back Android dari tab pertama).
export default function AcademyHeader(props: AcademyHeaderProps) {
  const { subtitle, fullName, photoPath, onAvatarPress } = props;
  const [photoFailed, setPhotoFailed] = useState(false);

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
      <PressableScale onPress={onAvatarPress} accessibilityLabel="Profil">
        {isDisplayablePhoto(photoPath) && !photoFailed ? (
          <SecureImage path={photoPath} style={styles.avatarImage} onLoadError={() => setPhotoFailed(true)} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{fullName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
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
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutralSurface,
  },
});
