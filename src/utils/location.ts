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

const TRACKED_FIX_MAX_AGE_MS = 60_000;
const TRACKED_FIX_MAX_ACCURACY_M = 50;

// Fix terakhir dari foreground service pelacakan (LocationForegroundService.kt), HANYA kalau
// cukup segar (<= 1 menit) dan akurat (<= 50 m) untuk dipakai sinyal darurat — null kalau tidak
// ada / tidak memenuhi, supaya pemanggil jatuh ke getCurrentCoordinates(). Fix tanpa nilai akurasi
// dianggap tidak layak. Batas ini sengaja ketat: koordinat darurat yang salah lebih berbahaya
// daripada menunggu fix GPS baru beberapa detik.
export async function getRecentTrackedCoordinates(): Promise<Coordinates | null> {
  try {
    const fix = await locationTracking.getLastLocation();
    if (!fix || fix.accuracy === null) return null;
    const ageMs = Date.now() - fix.time;
    if (ageMs < 0 || ageMs > TRACKED_FIX_MAX_AGE_MS) return null;
    if (fix.accuracy > TRACKED_FIX_MAX_ACCURACY_M) return null;
    return { latitude: fix.latitude, longitude: fix.longitude };
  } catch {
    return null;
  }
}

// Cek status izin lokasi tanpa memicu dialog permintaan izin (beda dari ensureAndroidPermission
// di atas) — dipakai untuk menampilkan status di UI (mis. panel pengaturan di Profile).
// iOS tidak punya API cek non-invasive setara tanpa library tambahan, jadi dianggap selalu aktif
// sama seperti fallback iOS lain di file ini (lihat ensureBackgroundTrackingPermissions).
export async function isLocationPermissionGranted(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
}

// Cek izin lokasi latar belakang ("Izinkan sepanjang waktu") tanpa memicu dialog. Android < 10
// tidak punya izin terpisah (izin foreground sudah mencakup latar belakang).
export async function isBackgroundLocationPermissionGranted(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version < 29 || !PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION) {
    return isLocationPermissionGranted();
  }
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
}

// Status toggle layanan lokasi (GPS/Network provider) di level OS — beda dari izin runtime di
// atas (bisa saja izin sudah diberikan tapi GPS-nya sendiri masih dimatikan user).
export async function isGpsEnabled(): Promise<boolean> {
  return locationTracking.isLocationServicesEnabled();
}

export function openAppSettings(): void {
  Linking.openSettings();
}

// Buka satu titik koordinat di aplikasi peta (Google Maps web/app) — dipakai tombol "Buka di
// Google Maps" di tab Lokasi personel/persit dan baris histori pergerakan.
export function openCoordinatesInMaps(latitude: number, longitude: number): void {
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
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

export type PermissionRequestResult = 'granted' | 'denied' | 'blocked';

function toRequestResult(result: string): PermissionRequestResult {
  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
  return 'denied';
}

// Izin notifikasi (Android 13+). Tidak pernah melempar — best-effort.
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version < 33 || !PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) return true;
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, {
    title: 'Izin Notifikasi',
    message: 'Notifikasi wajib ditampilkan selama pelacakan lokasi aktif.',
    buttonPositive: 'Izinkan',
    buttonNegative: 'Tolak',
  });
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// Izin lokasi foreground (FINE_LOCATION) versi tidak-melempar — `blocked` = OS tidak mau
// menampilkan dialog lagi ("jangan tanya lagi"), jadi pengguna harus lewat Pengaturan.
export async function requestForegroundLocationPermission(): Promise<PermissionRequestResult> {
  if (Platform.OS !== 'android') return 'granted';
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
    title: 'Izin Lokasi',
    message: 'Aplikasi memerlukan akses lokasi untuk mengirim sinyal darurat.',
    buttonPositive: 'Izinkan',
    buttonNegative: 'Tolak',
  });
  return toRequestResult(granted);
}

// Izin lokasi latar belakang ("Izinkan sepanjang waktu"). Android 10+ menolaknya kalau diminta
// bersamaan dengan izin foreground, jadi WAJIB diminta terpisah SETELAH izin foreground didapat.
// Di Android 11+ permintaan ini biasanya melempar pengguna ke halaman Pengaturan izin aplikasi.
export async function requestBackgroundLocationPermission(): Promise<PermissionRequestResult> {
  if (Platform.OS !== 'android') return 'granted';
  if (Platform.Version < 29 || !PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION) return 'granted';
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION, {
    title: 'Izin Lokasi Latar Belakang',
    message:
      'Aplikasi perlu mengirim posisi secara berkala meski aplikasi ditutup. Pilih "Izinkan sepanjang waktu" pada layar berikutnya.',
    buttonPositive: 'Izinkan',
    buttonNegative: 'Tolak',
  });
  return toRequestResult(granted);
}

// Urutan: notifikasi → lokasi → lokasi latar belakang. Notifikasi diminta paling awal karena
// permintaan lokasi latar belakang biasanya melempar pengguna ke halaman Settings (bukan dialog
// inline), yang menghentikan urutan permintaan izin di tengah jalan.
export async function ensureBackgroundTrackingPermissions(): Promise<BackgroundTrackingPermissionResult> {
  if (Platform.OS !== 'android') {
    return { backgroundGranted: true, notificationsGranted: true };
  }

  const notificationsGranted = await requestNotificationPermission();
  await ensureAndroidPermission();
  const backgroundGranted = (await requestBackgroundLocationPermission()) === 'granted';

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
