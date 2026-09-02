import { colors } from '@/theme/colors';
import type { RollCallEntryStatus, RollCallStatus } from '@/types';

// "2026-08-28" → "Jum, 28 Agu 2026".
export function rollCallDateLabel(date: string | null | undefined): string {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// "2026-08-28" → "Jumat, 28 Agustus 2026".
export function rollCallDateLong(date: string | null | undefined): string {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// "07:00:00" → "07:00".
export function rollCallTimeLabel(time: string | null | undefined): string {
  if (!time) return '-';
  return time.slice(0, 5);
}

export const rollCallStatusLabel: Record<RollCallStatus, string> = {
  open: 'Buka',
  closed: 'Ditutup',
};

// Warna angka persentase kehadiran mengikuti besarnya (hijau ≥90, amber ≥75, merah di bawahnya).
export function attendanceColor(percentage: number): string {
  if (percentage >= 90) return colors.success;
  if (percentage >= 75) return colors.warning;
  return colors.danger;
}

export const entryStatusLabel: Record<RollCallEntryStatus, string> = {
  present: 'Hadir',
  absent: 'Tidak Hadir',
};
