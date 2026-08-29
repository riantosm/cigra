import { Linking, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

import { locationTracking } from '@/native/locationTracking';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LocationErrorReason = 'permission-denied' | 'gps-disabled';

export class LocationUnavailableError extends Error {
  reason: LocationErrorReason;

  constructor(message: string, reason: LocationErrorReason) {
    super(message);
    this.reason = reason;
  }
}

async function ensureAndroidPermission(): Promise<void> {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Izin Lokasi',
      message: 'Aplikasi memerlukan akses lokasi untuk mengirim sinyal darurat.',
      buttonPositive: 'Izinkan',
      buttonNegative: 'Tolak',
    },
  );
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new LocationUnavailableError(
      'Izin lokasi ditolak. Aplikasi memerlukan izin lokasi untuk dapat mengirim sinyal darurat.',
      'permission-denied',
    );
  }
}

// code 1 = PERMISSION_DENIED (iOS), 2 = POSITION_UNAVAILABLE (biasanya GPS mati), 3 = TIMEOUT.
function errorForGeolocationCode(code: number): LocationUnavailableError {
  switch (code) {
    case 1:
      return new LocationUnavailableError(
        'Izin lokasi ditolak. Aktifkan izin lokasi untuk aplikasi ini di pengaturan.',
        'permission-denied',
      );
    case 2:
      return new LocationUnavailableError('Lokasi tidak ditemukan. Aktifkan GPS lalu coba lagi.', 'gps-disabled');
    case 3:
      return new LocationUnavailableError(
        'Waktu permintaan lokasi habis. Pastikan GPS aktif lalu coba lagi.',
        'gps-disabled',
      );
    default:
      return new LocationUnavailableError('Gagal mendapatkan lokasi. Pastikan GPS aktif lalu coba lagi.', 'gps-disabled');
  }
}

function requestPosition(options: { enableHighAccuracy: boolean; timeout: number; maximumAge: number }): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      error => reject(errorForGeolocationCode(error.code)),
      options,
    );
  });
}

export interface GetCurrentCoordinatesOptions {
  // GPS butuh lebih lama untuk fix baru (cold start setelah boot/lama tidak dipakai), terutama
  // di APK release yang dipakai di kondisi nyata (bukan device testing yang GPS-nya sudah "hangat").
  // 15 detik sering kurang dan memicu error timeout padahal GPS sebenarnya aktif.
  timeout?: number;
  // Kalau fix akurat timeout, coba sekali lagi pakai provider yang lebih longgar (network/cache)
  // sebelum benar-benar gagal — cocok untuk gate pre-warming di Home yang cuma perlu tahu layanan
  // lokasi memang berfungsi, TAPI jangan dipakai di alur yang akurasinya kritis (panic button,
  // update posisi manual) karena hasilnya bisa jadi lokasi lama/kurang akurat.
  allowFallbackToLowAccuracy?: boolean;
}

export async function getCurrentCoordinates(options: GetCurrentCoordinatesOptions = {}): Promise<Coordinates> {
  const { timeout = 25000, allowFallbackToLowAccuracy = false } = options;

  if (Platform.OS === 'android') {
    await ensureAndroidPermission();
  }

  try {
    return await requestPosition({ enableHighAccuracy: true, timeout, maximumAge: 10000 });
  } catch (error) {
    if (allowFallbackToLowAccuracy && error instanceof LocationUnavailableError && error.reason === 'gps-disabled') {
      return requestPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    }
    throw error;
  }
}

export function openAppSettings(): void {
  Linking.openSettings();
}

export function openLocationSettings(): void {
  if (Platform.OS === 'android') {
    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => Linking.openSettings());
    return;
  }
  Linking.openSettings();
}

export interface BackgroundTrackingPermissionResult {
  backgroundGranted: boolean;
  notificationsGranted: boolean;
}

// Android 10+ menolak ACCESS_BACKGROUND_LOCATION jika diminta bersamaan dengan izin foreground,
// jadi ini WAJIB diminta sebagai request terpisah setelah izin lokasi foreground didapat.
export async function ensureBackgroundTrackingPermissions(): Promise<BackgroundTrackingPermissionResult> {
  if (Platform.OS !== 'android') {
    return { backgroundGranted: true, notificationsGranted: true };
  }

  await ensureAndroidPermission();

  // POST_NOTIFICATIONS diminta lebih dulu — ACCESS_BACKGROUND_LOCATION di bawah biasanya
  // langsung melempar user ke halaman Settings (bukan dialog inline), yang menghentikan urutan
  // permintaan izin di tengah jalan jika notifikasi diminta setelahnya.
  let notificationsGranted = true;
  if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, {
      title: 'Izin Notifikasi',
      message: 'Notifikasi wajib ditampilkan selama pelacakan lokasi aktif.',
      buttonPositive: 'Izinkan',
      buttonNegative: 'Tolak',
    });
    notificationsGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  let backgroundGranted = true;
  if (Platform.Version >= 29 && PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      {
        title: 'Izin Lokasi Latar Belakang',
        message:
          'Aplikasi perlu mengirim posisi secara berkala meski aplikasi ditutup. Pilih "Izinkan sepanjang waktu" pada layar berikutnya.',
        buttonPositive: 'Izinkan',
        buttonNegative: 'Tolak',
      },
    );
    backgroundGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  return { backgroundGranted, notificationsGranted };
}

// Dipanggil setelah login berhasil. Best-effort: kegagalan izin latar belakang tidak
// menggagalkan login, hanya berarti pelacakan lokasi background tidak berjalan penuh.
export async function startBackgroundLocationTracking(): Promise<BackgroundTrackingPermissionResult> {
  const permissions = await ensureBackgroundTrackingPermissions();
  await locationTracking.startTracking();
  return permissions;
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  await locationTracking.stopTracking();
}
