import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { AppUpdateStatus, AppVersionInfo, AppVersionPlatformInfo } from '@/types';

// Parse "0.2", "1.0.2", "1.10.0-beta.1+build" → [major, minor, patch] (metadata pre-release/build
// diabaikan). Segmen non-numerik / string kosong → null (versi tidak dikenal).
function parseVersion(version: string | null | undefined): number[] | null {
  if (!version) return null;
  const core = version.trim().split(/[-+]/)[0];
  if (!core) return null;
  const parts = core.split('.').map(segment => Number(segment));
  if (parts.some(n => !Number.isInteger(n) || n < 0)) return null;
  return parts;
}

// Angka build number yang toleran tipe — backend bisa mengirim `latest_build` sebagai number (`2`)
// atau string (`"2"`); dua-duanya harus terbaca. Selain itu → null (cek build dilewati).
function toBuildNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// Semantic-version compare: 0.2 < 0.3 < 0.10 < 1.0. Segmen yang hilang dianggap 0.
// Return <0 jika a < b, 0 jika sama, >0 jika a > b. Lempar kalau salah satu tidak bisa diparse.
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) throw new Error(`versi tidak valid: "${a}" / "${b}"`);
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Blok platform sesuai OS yang berjalan.
export function platformInfo(info: AppVersionInfo): AppVersionPlatformInfo {
  return Platform.OS === 'ios' ? info.ios : info.android;
}

// Evaluasi versi + build terpasang vs blok platform (documentation/API_CONTRACT.md §1.2):
// - build terpasang < `latest_build` (APK di API lebih baru) → 'required' (wajib unduh APK baru)
// - `version` terpasang < `min_supported_version`           → 'required'
// - `min_supported_version` <= `version` < `latest_version` → 'suggested'
// - selain itu (termasuk `version` terpasang tak terbaca)   → 'none'
export function evaluateUpdateStatus(
  installedVersion: string,
  installedBuild: number | null,
  info: AppVersionPlatformInfo,
): AppUpdateStatus {
  // Cek build number DULU, sebelum cek `version` string — build number (Android `versionCode` /
  // iOS `CFBundleVersion`) naik tiap rilis APK. Kalau `latest_build` di API > build terpasang,
  // ada APK baru yang wajib diunduh, sekalipun string `version`-nya sama / tidak bisa diparse.
  // `latest_build` 2 vs APK 1 → 'required'; `latest_build` 2 vs APK 2 → tidak (2 < 2 = false).
  const installed = toBuildNumber(installedBuild);
  const latest = toBuildNumber(info.latest_build);
  if (installed !== null && latest !== null && installed < latest) return 'required';

  if (!parseVersion(installedVersion)) return 'none';
  try {
    if (compareVersions(installedVersion, info.min_supported_version) < 0) return 'required';
    if (compareVersions(installedVersion, info.latest_version) < 0) return 'suggested';
  } catch {
    return 'none';
  }
  return 'none';
}

// "Nanti" pada update yang disarankan menyimpan versi yang di-skip supaya modal tidak muncul lagi
// untuk versi itu — sampai backend merilis versi yang lebih baru.
const SKIPPED_VERSION_KEY = 'skipped_app_version';

export async function getSkippedVersion(): Promise<string | null> {
  return AsyncStorage.getItem(SKIPPED_VERSION_KEY);
}

export async function isVersionSkipped(latestVersion: string): Promise<boolean> {
  const skipped = await getSkippedVersion();
  if (!skipped) return false;
  try {
    // Skip hanya berlaku selama `latest` belum melewati versi yang di-skip.
    return compareVersions(latestVersion, skipped) <= 0;
  } catch {
    return skipped === latestVersion;
  }
}

export async function skipVersion(latestVersion: string): Promise<void> {
  await AsyncStorage.setItem(SKIPPED_VERSION_KEY, latestVersion);
}
