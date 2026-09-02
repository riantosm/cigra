import { Camera } from 'react-native-vision-camera';

import { openAppSettings } from '@/utils/location';

export type CameraPermissionOutcome = 'granted' | 'denied' | 'blocked';

// Minta izin kamera lewat VisionCamera.
// - `granted`  : izin diberikan (baru saja atau sudah sebelumnya).
// - `denied`   : user menolak dialog kali ini (masih bisa diminta lagi nanti).
// - `blocked`  : izin ditolak permanen ("Jangan tanya lagi") — dialog OS tidak akan muncul lagi,
//                user harus mengaktifkannya manual lewat Pengaturan aplikasi (openCameraSettings).
export async function requestCameraPermission(): Promise<CameraPermissionOutcome> {
  const before = Camera.getCameraPermissionStatus();
  if (before === 'granted') return 'granted';

  const result = await Camera.requestCameraPermission();
  if (result === 'granted') return 'granted';

  // Sudah 'denied'/'restricted' SEBELUM diminta → dialog tidak muncul lagi = blocked.
  // 'not-determined' sebelumnya tapi sekarang ditolak → penolakan biasa (bisa diminta lagi).
  return before === 'not-determined' ? 'denied' : 'blocked';
}

export function getCameraPermissionStatus(): CameraPermissionOutcome {
  const status = Camera.getCameraPermissionStatus();
  if (status === 'granted') return 'granted';
  if (status === 'not-determined') return 'denied';
  return 'blocked';
}

// Buka halaman Pengaturan aplikasi supaya user bisa menyalakan izin kamera secara manual.
export function openCameraSettings(): void {
  openAppSettings();
}
