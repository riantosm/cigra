import type { BadgeVariant } from '@/components/atoms/Badge';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';
import type { RollCallAgendaStatus } from '@/types';

// Role yang otomatis diberikan backend saat penunjukan (dicabut lagi saat penugasan diakhiri).
export const ROLL_CALL_OFFICER_ROLE = 'piket';
export const ROLL_CALL_REPRESENTATIVE_ROLE = 'perwakilan_kompi';
export const COMMANDER_ROLE = 'komandan';

// Membuka / menutup agenda, rangkuman, statistik, dan pengaturan: komandan + petugas piket.
export function canManageRollCall(roles: string[] | null | undefined): boolean {
  const list = roles ?? [];
  return list.includes(COMMANDER_ROLE) || list.includes(ROLL_CALL_OFFICER_ROLE);
}

export function isRollCallRepresentative(roles: string[] | null | undefined): boolean {
  return (roles ?? []).includes(ROLL_CALL_REPRESENTATIVE_ROLE);
}

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

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

// "07:30:00" → "07.30"; ISO "2026-09-25T21:30:00+07:00" → "21.30" (jam lokal perangkat).
export function rollCallClock(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{1,2}:\d{2}/.test(value)) return value.slice(0, 5).replace(':', '.');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${pad(parsed.getHours())}.${pad(parsed.getMinutes())}`;
}

// "07:30:00" + "09:00:00" → "07.30–09.00".
export function sessionRangeLabel(start: string | null | undefined, end: string | null | undefined): string {
  const from = rollCallClock(start);
  const to = rollCallClock(end);
  if (from && to) return `${from}–${to}`;
  return from ?? to ?? '-';
}

// Date → "YYYY-MM-DD" (tanggal lokal, bukan UTC).
export function toApiDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Date → "HH:MM".
export function toApiTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// "07:30:00" → Date hari ini jam 07:30 (untuk DateTimeField mode time).
export function timeToDate(time: string | null | undefined, fallbackHour = 7): Date {
  const next = new Date();
  const match = /^(\d{1,2}):(\d{2})/.exec(time ?? '');
  next.setHours(match ? Number(match[1]) : fallbackHour, match ? Number(match[2]) : 0, 0, 0);
  return next;
}

export type RollCallAgendaState = 'open' | 'locked' | 'closed';

// TERBUKA = masih bisa diisi · TERKUNCI = status open tapi lewat jam berakhir sesi ·
// DITUTUP = sudah ditutup piket lewat /finish.
export function agendaState(agenda: { status: RollCallAgendaStatus; is_locked: boolean }): RollCallAgendaState {
  if (agenda.status !== 'open') return 'closed';
  return agenda.is_locked ? 'locked' : 'open';
}

export const AGENDA_STATE_META: Record<
  RollCallAgendaState,
  { label: string; variant: BadgeVariant; icon?: IconName }
> = {
  open: { label: 'TERBUKA', variant: 'success' },
  locked: { label: 'TERKUNCI', variant: 'neutral', icon: 'clock' },
  closed: { label: 'DITUTUP', variant: 'neutral', icon: 'lock' },
};

// Warna angka persentase kehadiran (hijau ≥90, amber ≥75, merah di bawahnya). Amber memakai
// `warningText` supaya tetap terbaca di atas kartu putih.
export function attendanceColor(percentage: number): string {
  if (percentage >= 90) return colors.success;
  if (percentage >= 75) return colors.warningText;
  return colors.danger;
}

// 0.9747 → "97,5".
export function formatRatioPercent(ratio: number): string {
  return (ratio * 100).toFixed(1).replace('.', ',');
}

export function formatCount(value: number): string {
  return value.toLocaleString('id-ID');
}

// "Andi Pratama" → "AP".
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || '?';
}

// Warna bar "Sebaran Alasan Tidak Hadir" — urut dari alasan terbanyak. Semua memakai token
// aksen yang sudah ada supaya palet aplikasi tidak bertambah.
export const ROLL_CALL_REASON_PALETTE: string[] = [
  colors.primary,
  colors.warning,
  colors.gradientWeaponStart,
  colors.gradientHealthEnd,
  colors.gradientFamilyEnd,
  colors.success,
  colors.textMuted,
];

// Kelompokkan item ber-`date` (urutan input dipertahankan) → [{ date, items }].
export function groupByDate<T extends { date: string }>(items: T[]): { date: string; items: T[] }[] {
  const groups: { date: string; items: T[] }[] = [];
  items.forEach(item => {
    const last = groups[groups.length - 1];
    if (last && last.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  });
  return groups;
}

// Urutkan agenda terbaru dulu (tanggal, lalu id).
export function sortNewestFirst<T extends { date: string; id: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
}
