import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import MainLayout from '@/components/templates/MainLayout';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

export default function BukuSakuScreen() {
  return (
    <MainLayout title="Buku Saku">
      <View style={styles.container}>
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}
          style={styles.content}>
          <Text style={styles.title}>Buku Saku</Text>
          <Text style={styles.subtitle}>Belum ada konten buku saku saat ini</Text>
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
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
