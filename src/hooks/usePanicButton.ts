import { useCallback, useState } from 'react';
import axios from 'axios';

import type { StatusModalAction, StatusModalVariant } from '@/components/organisms/StatusModal';
import { sendPanicButtonApi } from '@/services/api/panicButton.service';
import {
  getCurrentCoordinates,
  LocationUnavailableError,
  openAppSettings,
  openLocationSettings,
} from '@/utils/location';

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

interface PanicButtonModalState {
  visible: boolean;
  variant: StatusModalVariant;
  title: string;
  message: string;
  primaryAction: StatusModalAction;
  secondaryAction?: StatusModalAction;
}

const initialModalState: PanicButtonModalState = {
  visible: false,
  variant: 'success',
  title: '',
  message: '',
  primaryAction: { label: 'OK', onPress: () => {} },
  secondaryAction: undefined,
};

export function usePanicButton() {
  const [isSending, setIsSending] = useState(false);
  const [modal, setModal] = useState<PanicButtonModalState>(initialModalState);

  const closeModal = useCallback(() => setModal(initialModalState), []);

  const sendPanicSignal = useCallback(async () => {
    setIsSending(true);
    try {
      const { latitude, longitude } = await getCurrentCoordinates();
      await sendPanicButtonApi({ latitude, longitude });
      setModal({
        visible: true,
        variant: 'success',
        title: 'Sinyal Terkirim',
        message:
          'Sinyal darurat berhasil dikirim beserta lokasi Anda. Notifikasi & sirene akan berbunyi setelah diteruskan ke komando, mohon tunggu beberapa saat.',
        primaryAction: { label: 'OK', onPress: closeModal },
      });
    } catch (error) {
      if (error instanceof LocationUnavailableError) {
        const isGpsIssue = error.reason === 'gps-disabled';
        setModal({
          visible: true,
          variant: 'error',
          title: isGpsIssue ? 'Aktifkan Lokasi' : 'Izin Lokasi Diperlukan',
          message: error.message,
          primaryAction: { label: 'OK', onPress: closeModal },
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
          primaryAction: { label: 'OK', onPress: closeModal },
        });
      }
    } finally {
      setIsSending(false);
    }
  }, [closeModal]);

  return { isSending, modal, closeModal, sendPanicSignal };
}
