import { axiosInstance } from '@/services/api/axiosInstance';

// `POST/DELETE /devices/firebase-token` — mendaftarkan / menghapus FCM device token milik user
// aktif di backend, dipakai untuk push notification disposisi surat (yang dikirim per-user, bukan
// lewat topic seperti broadcast darurat). Register dipanggil setelah Firebase siap & token
// didapat (lihat `utils/pushNotifications.ts`), delete dipanggil saat logout.
export async function registerFcmTokenApi(fcmToken: string): Promise<void> {
  await axiosInstance.post('/devices/firebase-token', { fcm_token: fcmToken });
}

export async function unregisterFcmTokenApi(): Promise<void> {
  await axiosInstance.delete('/devices/firebase-token');
}
