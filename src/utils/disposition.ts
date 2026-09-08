import type { BadgeVariant } from '@/components/atoms/Badge';
import { colors } from '@/theme/colors';
import type {
  DispositionPriority,
  DispositionRecipientStatus,
  DispositionStatus,
  SecurityLevel,
} from '@/types';

// --- Status disposisi ---

export const dispositionStatusLabel: Record<DispositionStatus, string> = {
  pending: 'Menunggu',
  in_progress: 'Dalam Proses',
  completed: 'Selesai',
  archived: 'Diarsipkan',
  draft: 'Draf',
  sent: 'Terkirim',
};

export const dispositionStatusBadgeVariant: Record<DispositionStatus, BadgeVariant> = {
  pending: 'neutral',
  in_progress: 'warning',
  completed: 'success',
  archived: 'neutral',
  draft: 'neutral',
  sent: 'primary',
};

export function statusLabel(status: DispositionStatus, fallback?: string): string {
  return dispositionStatusLabel[status] ?? fallback ?? status;
}

// --- Tingkat keamanan surat ---

export const securityLevelLabel: Record<SecurityLevel, string> = {
  biasa: 'Biasa',
  penting: 'Penting',
  rahasia: 'Rahasia',
};

export const securityLevelBadgeVariant: Record<SecurityLevel, BadgeVariant> = {
  biasa: 'neutral',
  penting: 'warning',
  rahasia: 'danger',
};

export const SECURITY_LEVELS: SecurityLevel[] = ['biasa', 'penting', 'rahasia'];

// --- Prioritas disposisi ---

export const priorityLabel: Record<DispositionPriority, string> = {
  normal: 'Normal',
  important: 'Penting',
  urgent: 'Segera',
};

export const priorityDotColor: Record<DispositionPriority, string> = {
  normal: colors.textMuted,
  important: colors.warning,
  urgent: colors.danger,
};

export const priorityBadgeVariant: Record<DispositionPriority, BadgeVariant> = {
  normal: 'neutral',
  important: 'warning',
  urgent: 'danger',
};

export const PRIORITIES: DispositionPriority[] = ['normal', 'important', 'urgent'];

// --- Status penerima ---

export const recipientStatusLabel: Record<DispositionRecipientStatus, string> = {
  unread: 'Belum Dibaca',
  read: 'Sudah Dibaca',
  completed: 'Selesai',
};

export const recipientStatusBadgeVariant: Record<DispositionRecipientStatus, BadgeVariant> = {
  unread: 'neutral',
  read: 'primary',
  completed: 'success',
};

// --- Tanggal ---

// "2026-09-01" → "01 Sep 2026". `YYYY-MM-DD` atau ISO.
export function letterDateLabel(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// `Date` → "YYYY-MM-DD" (untuk payload API).
export function toApiDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
