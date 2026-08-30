import { Modal, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import QrCode from '@/components/molecules/QrCode';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

export interface QrIdentityModalProps {
  visible: boolean;
  // Isi QR (NRP / service_number).
  value: string | null | undefined;
  name: string;
  // Baris kecil di bawah nama, mis. "NRP 31980412345678".
  subtitle: string;
  onRequestClose: () => void;
}

// Tampilan QR ukuran penuh ("Tampilkan Penuh" di Kartu Anggota) — layar ditinggikan kecerahannya
// oleh user secara manual; kita hanya beri hint. Pola Modal + MotiView disamakan dengan StatusModal.
export default function QrIdentityModal(props: QrIdentityModalProps) {
  const { visible, value, name, subtitle, onRequestClose } = props;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <MotiView
          from={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={contentEnterTransition}
          style={styles.card}>
          <Text style={styles.title}>QR Identitas</Text>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.qrWrap}>
            <QrCode value={value} size={240} />
          </View>

          <View style={styles.hintRow}>
            <Icon name="sun" size={16} color={colors.textMuted} />
            <Text style={styles.hint}>Naikkan kecerahan layar agar mudah dipindai</Text>
          </View>

          <Button label="Tutup" variant="secondary" onPress={onRequestClose} style={styles.closeButton} />
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  name: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  qrWrap: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  hintRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  closeButton: {
    marginTop: 20,
    width: '100%',
  },
});
