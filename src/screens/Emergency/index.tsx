import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import MainLayout from '@/components/templates/MainLayout';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

export default function EmergencyScreen() {
  return (
    <MainLayout title="Emergency">
      <View style={styles.container}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={contentEnterTransition}
          style={styles.content}>
          <View style={styles.badge}>
            <Icon name="emergency" size={40} color={colors.dangerForeground} />
          </View>
          <Text style={styles.title}>Tombol Darurat</Text>
          <Text style={styles.subtitle}>Tekan tombol merah di bawah untuk mengirim sinyal darurat</Text>
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
    paddingHorizontal: 32,
    paddingBottom: 96,
  },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    height: 88,
    width: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
