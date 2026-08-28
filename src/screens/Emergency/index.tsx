import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import axios from 'axios';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import StatusModal from '@/components/organisms/StatusModal';
import type { StatusModalAction, StatusModalVariant } from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { sendPanicButtonApi } from '@/services/api/panicButton.service';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';
import { getCurrentCoordinates, LocationUnavailableError, openAppSettings, openLocationSettings } from '@/utils/location';

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

interface StatusModalState {
  visible: boolean;
  variant: StatusModalVariant;
  title: string;
  message: string;
  secondaryAction?: StatusModalAction;
}

const initialModalState: StatusModalState = {
  visible: false,
  variant: 'success',
  title: '',
  message: '',
  secondaryAction: undefined,
};

export default function EmergencyScreen() {
  const [isSending, setIsSending] = useState(false);
  const [modal, setModal] = useState<StatusModalState>(initialModalState);

  function closeModal() {
    setModal(initialModalState);
  }

  async function handlePanicPress() {
    if (isSending) return;
    setIsSending(true);
    try {
      const { latitude, longitude } = await getCurrentCoordinates();
      await sendPanicButtonApi({ latitude, longitude });
      setModal({
        visible: true,
        variant: 'success',
        title: 'Sinyal Terkirim',
        message: 'Sinyal darurat berhasil dikirim beserta lokasi Anda.',
      });
    } catch (error) {
      if (error instanceof LocationUnavailableError) {
        const isGpsIssue = error.reason === 'gps-disabled';
        setModal({
          visible: true,
          variant: 'error',
          title: isGpsIssue ? 'Aktifkan Lokasi' : 'Izin Lokasi Diperlukan',
          message: error.message,
          secondaryAction: {
            label: isGpsIssue ? 'Buka Pengaturan Lokasi' : 'Buka Pengaturan',
            onPress: isGpsIssue ? openLocationSettings : openAppSettings,
          },
        });
      } else {
        setModal({
          visible: true,
          variant: 'error',
          title: 'Gagal Mengirim',
          message: extractErrorMessage(error, 'Sinyal darurat gagal dikirim.'),
        });
      }
    } finally {
      setIsSending(false);
    }
  }

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
          <Button
            label="Kirim Sinyal Darurat"
            variant="danger"
            loading={isSending}
            onPress={handlePanicPress}
            style={styles.button}
          />
        </MotiView>
      </View>

      <StatusModal
        visible={modal.visible}
        variant={modal.variant}
        title={modal.title}
        message={modal.message}
        onRequestClose={closeModal}
        primaryAction={{ label: 'OK', onPress: closeModal }}
        secondaryAction={
          modal.secondaryAction
            ? {
                ...modal.secondaryAction,
                onPress: () => {
                  closeModal();
                  modal.secondaryAction?.onPress();
                },
              }
            : undefined
        }
      />
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
  button: {
    marginTop: 24,
    width: '100%',
  },
});
