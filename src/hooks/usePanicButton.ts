import { useCallback, useState, useSyncExternalStore } from 'react';
import axios from 'axios';

import type { StatusModalAction, StatusModalVariant } from '@/components/organisms/StatusModal';
import { sendPanicButtonApi } from '@/services/api/panicButton.service';
import {
  getCurrentCoordinates,
  getRecentTrackedCoordinates,
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

// Status kirim dibagi antar SEMUA pemakai hook (tombol bottom tab + tombol halaman Kirim Sinyal),
// supaya keduanya sama-sama menampilkan spinner dan sinyal tidak bisa terkirim dobel dari tombol
// yang satunya selagi pengiriman masih berjalan. Modal hasil tetap per-pemakai (hanya tombol yang
// memicu yang menampilkannya).
let sharedIsSending = false;
const sendingListeners = new Set<() => void>();

function setSharedIsSending(value: boolean) {
  sharedIsSending = value;
  sendingListeners.forEach(listener => listener());
}

function subscribeSending(listener: () => void) {
  sendingListeners.add(listener);
  return () => {
    sendingListeners.delete(listener);
  };
}

const getSharedIsSending = () => sharedIsSending;

export function usePanicButton() {
  const isSending = useSyncExternalStore(subscribeSending, getSharedIsSending);
  const [modal, setModal] = useState<PanicButtonModalState>(initialModalState);

  const closeModal = useCallback(() => setModal(initialModalState), []);

  const sendPanicSignal = useCallback(async () => {
    if (sharedIsSending) return;
    setSharedIsSending(true);
    try {
      // Jalur cepat: fix segar dari service pelacakan latar (instan). Kalau tidak ada / basi / kurang
      // akurat, baru cari fix GPS baru (bisa sampai ~25 detik).
      const { latitude, longitude } = (await getRecentTrackedCoordinates()) ?? (await getCurrentCoordinates());
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
      setSharedIsSending(false);
    }
  }, [closeModal]);

  return { isSending, modal, closeModal, sendPanicSignal };
}
