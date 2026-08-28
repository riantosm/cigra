import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import MainLayout from '@/components/templates/MainLayout';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

export default function HomeScreen() {
  const user = useAppSelector(state => state.auth.user);

  return (
    <MainLayout title="Home">
      <View style={styles.container}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={contentEnterTransition}
          style={styles.content}>
          <Text style={styles.title}>Welcome, {user?.name ?? 'User'} 👋</Text>
          <Text style={styles.subtitle}>Selamat datang di Smart Battalion</Text>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
