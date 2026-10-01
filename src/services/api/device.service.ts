import { axiosInstance } from '@/services/api/axiosInstance';

// `POST/DELETE /devices/firebase-token` — mendaftarkan / melepas FCM device token milik user
// aktif di backend, dipakai untuk push yang dikirim per-user (disposisi, pengumuman, darurat).
// Backend menyimpan token PER PERANGKAT (satu user boleh punya banyak: ponsel + tablet + web),
// jadi register wajib menyertakan identitas perangkat, dan unregister wajib menyebut token
// perangkat ini — DELETE tanpa body melepas SEMUA perangkat user (termasuk web/tablet lain).
// Register dipanggil setelah Firebase siap & token didapat (lihat `utils/pushNotifications.ts`),
// delete dipanggil saat logout.

export type DevicePlatform = 'android' | 'ios' | 'web';

export interface RegisterFcmTokenPayload {
  fcm_token: string;
  platform: DevicePlatform;
  device_id: string;
  device_name?: string;
}

export async function registerFcmTokenApi(payload: RegisterFcmTokenPayload): Promise<void> {
  await axiosInstance.post('/devices/firebase-token', payload);
}

// Lepas HANYA token perangkat ini. Sengaja tidak ada varian tanpa token dari app.
export async function unregisterFcmTokenApi(token: string): Promise<void> {
  await axiosInstance.delete('/devices/firebase-token', { data: { token } });
}
