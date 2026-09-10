import type { BadgeVariant } from '@/components/atoms/Badge';
import type {
  AcademyComponent,
  AcademyParticipantStatus,
  AcademyProgramStatus,
} from '@/types';

export interface AcademyBadge {
  label: string;
  variant: BadgeVariant;
}

// --- Status program (Belum Dimulai / Berjalan / Selesai) ---
export function programStatusBadge(
  status: AcademyProgramStatus | null | undefined,
  participantStatus?: AcademyParticipantStatus | null,
): AcademyBadge {
  const s = participantStatus ?? status;
  switch (s) {
    case 'completed':
    case 'passed':
      return { label: 'Selesai', variant: 'success' };
    case 'failed':
      return { label: 'Tidak Lulus', variant: 'danger' };
    case 'ongoing':
    case 'in_progress':
    case 'published':
      return { label: 'Berjalan', variant: 'primary' };
    case 'not_started':
    case 'draft':
    default:
      return { label: 'Belum Dimulai', variant: 'neutral' };
  }
}

// --- Status hasil (Lulus / Tidak Lulus) ---
export function resultStatusBadge(finalStatus: string | null | undefined): AcademyBadge {
  const s = (finalStatus ?? '').toLowerCase();
  if (s === 'passed' || s === 'lulus') return { label: 'Lulus', variant: 'success' };
  if (s === 'failed' || s === 'tidak lulus' || s === 'not_passed') {
    return { label: 'Tidak Lulus', variant: 'danger' };
  }
  return { label: 'Menunggu', variant: 'warning' };
}

// --- Status verifikasi praktik (Menunggu / Terverifikasi / Ditolak / Dikoreksi) ---
export function verificationStatusBadge(status: string | null | undefined): AcademyBadge {
  switch ((status ?? '').toLowerCase()) {
    case 'verified':
    case 'terverifikasi':
      return { label: 'Terverifikasi', variant: 'success' };
    case 'rejected':
    case 'ditolak':
      return { label: 'Ditolak', variant: 'danger' };
    case 'corrected':
    case 'dikoreksi':
      return { label: 'Dikoreksi', variant: 'primary' };
    case 'graded':
    case 'dinilai':
      return { label: 'Dinilai', variant: 'primary' };
    case 'not_graded':
    case 'belum_dinilai':
      return { label: 'Belum Dinilai', variant: 'warning' };
    default:
      return { label: 'Menunggu', variant: 'warning' };
  }
}

// --- Status kompetensi (Aktif / Akan Kedaluwarsa / Kedaluwarsa) ---
export function competencyStatusBadge(
  status: string | null | undefined,
  expiresAt?: string | null,
): AcademyBadge {
  const raw = (status ?? '').toLowerCase();
  if (raw === 'expired' || raw === 'kedaluwarsa' || raw === 'revoked') {
    return { label: 'Kedaluwarsa', variant: 'danger' };
  }
  if (raw === 'expiring' || raw === 'akan_kedaluwarsa') {
    return { label: 'Akan Kedaluwarsa', variant: 'warning' };
  }
  // Kalau backend cuma kirim `active`, cek sendiri apakah < 60 hari lagi.
  if (expiresAt) {
    const days = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000;
    if (Number.isFinite(days)) {
      if (days < 0) return { label: 'Kedaluwarsa', variant: 'danger' };
      if (days <= 60) return { label: 'Akan Kedaluwarsa', variant: 'warning' };
    }
  }
  return { label: 'Aktif', variant: 'success' };
}

// --- Status komponen kurikulum (Selesai / Tersedia / Menunggu Verifikasi / ...) ---
export function componentStatusBadge(
  component: Pick<AcademyComponent, 'status' | 'is_completed'>,
): AcademyBadge {
  const raw = (component.status ?? '').toLowerCase();
  // `status` kaya (menunggu verifikasi / tidak lulus / dst) menang atas `is_completed`;
  // kalau status kosong, `is_completed` menentukan Selesai vs Tersedia.
  if (!raw) {
    return component.is_completed
      ? { label: 'Selesai', variant: 'success' }
      : { label: 'Tersedia', variant: 'primary' };
  }
  switch (raw) {
    case 'completed':
    case 'selesai':
      return { label: 'Selesai', variant: 'success' };
    case 'in_progress':
    case 'sedang_dikerjakan':
      return { label: 'Sedang Dikerjakan', variant: 'primary' };
    case 'pending_verification':
    case 'menunggu_verifikasi':
      return { label: 'Menunggu Verifikasi', variant: 'warning' };
    case 'passed':
    case 'lulus':
      return { label: 'Lulus', variant: 'success' };
    case 'failed':
    case 'tidak_lulus':
      return { label: 'Tidak Lulus', variant: 'danger' };
    case 'locked':
    case 'belum_tersedia':
      return { label: 'Belum Tersedia', variant: 'neutral' };
    default:
      return { label: 'Tersedia', variant: 'primary' };
  }
}

export function componentTypeLabel(type: string | null | undefined): string {
  switch (type) {
    case 'material':
      return 'Materi';
    case 'assessment':
      return 'Assessment';
    case 'practical':
      return 'Praktik';
    default:
      return type ?? '-';
  }
}

// Sisa waktu attempt dalam detik — pakai `server_time` sebagai basis (jangan percaya jam device),
// lalu hitung mundur lokal dari selisih itu. Kembalikan 0 kalau sudah lewat / data kurang.
export function attemptRemainingSeconds(
  expiresAt: string | null | undefined,
  serverTime: string | null | undefined,
): number {
  if (!expiresAt) return 0;
  const expires = new Date(expiresAt).getTime();
  const base = serverTime ? new Date(serverTime).getTime() : Date.now();
  if (!Number.isFinite(expires) || !Number.isFinite(base)) return 0;
  return Math.max(0, Math.round((expires - base) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

export function formatDurationLabel(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) return '-';
  const minutes = Math.round(totalSeconds / 60);
  return `${minutes} menit`;
}

// Format skor: 89.2 → "89,2", 90 → "90", "89.00" → "89". Backend kadang kirim angka
// sebagai string ("46.67") — koersi dulu.
export function formatScore(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n == null || !Number.isFinite(n)) return '-';
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
}

export function formatPercent(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n == null || !Number.isFinite(n)) return '-';
  return `${Math.round(n)}%`;
}

// Selisih hari dari sekarang ke `date` — untuk label "N hari lagi" / "terlambat N hari".
export function daysUntilLabel(date: string | null | undefined): string | null {
  if (!date) return null;
  const target = new Date(date).getTime();
  if (!Number.isFinite(target)) return null;
  const days = Math.ceil((target - Date.now()) / 86_400_000);
  if (days < 0) return `Terlambat ${Math.abs(days)} hari`;
  if (days === 0) return 'Hari ini';
  return `${days} hari lagi`;
}
