import Config from 'react-native-config';
import { getCrashlytics, recordError, setAttributes, setUserId } from '@react-native-firebase/crashlytics';

import type { AuthUser } from '@/types';

// Semua pemanggilan dibungkus try/catch: brand tanpa google-services-<brand>.json dibangun tanpa
// Firebase, dan getCrashlytics() melempar kalau Firebase belum terkonfigurasi — laporan crash
// tidak boleh sampai membuat app ikut error.

// Identitas user + brand di tiap laporan crash, supaya bisa dicari per NRP/role di Console.
// Dipanggil tiap `user` berubah (login, refreshUser); `null` = logout → identitas dikosongkan.
export function syncCrashlyticsUser(user: AuthUser | null): void {
  try {
    const crashlytics = getCrashlytics();
    setUserId(crashlytics, user ? String(user.id) : '').catch(() => {});
    setAttributes(crashlytics, {
      brand: Config.BRAND ?? 'sakaraguna',
      username: user?.username ?? '',
      nrp: user?.personnel?.service_number ?? '',
      roles: user?.roles?.join(',') ?? '',
      tenant_id: user ? String(user.tenant_id) : '',
    }).catch(() => {});
  } catch {
    // Firebase belum dikonfigurasi untuk brand ini — abaikan.
  }
}

// Catat error yang tertangkap (non-fatal) — error JS yang TIDAK tertangkap sudah otomatis
// dilaporkan sebagai fatal oleh handler global Crashlytics.
export function reportNonFatal(error: unknown, context?: string): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    recordError(getCrashlytics(), err, context);
  } catch {
    // Firebase belum dikonfigurasi untuk brand ini — abaikan.
  }
}
