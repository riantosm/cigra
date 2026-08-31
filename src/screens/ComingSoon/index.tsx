import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

export type ComingSoonScreenProps = RootStackScreenProps<typeof ROUTES.comingSoon>;

// Tujuan generik buat semua Quick Action yang belum punya fitur/API sendiri — biar tetap bisa
// ditekan (bukan disable) dan mengarah ke halaman nyata, bukan diam saja.
export default function ComingSoonScreen(props: ComingSoonScreenProps) {
  const { navigation, route } = props;
  const { title } = route.params;

  return (
    <MainLayout
      title={title}
      subtitle="Fitur segera hadir"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={styles.container}>
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}
          style={styles.content}>
          <View style={styles.badge}>
            <Icon name="clock" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Fitur ini belum tersedia saat ini</Text>
        </MotiView>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 96,
  },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    height: 64,
    width: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.heading,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
