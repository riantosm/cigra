import { colors } from '@/theme/colors';
import type { PatrolRoute, PatrolSessionStatus } from '@/types';

export const patrolStatusLabel: Record<PatrolSessionStatus, string> = {
  in_progress: 'Sedang Berjalan',
  completed: 'Selesai',
};

// ISO ("...+07:00" atau "...Z") → "09:00" pada zona waktu perangkat (konvensi app: lihat
// utils/format.ts `formatDateTime`; perangkat operasional diset ke WIB).
export function patrolClockLabel(iso: string | null | undefined): string {
  if (!iso) return '-';
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? '-'
    : parsed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// ISO → "1 Sep 2026" (zona perangkat).
export function patrolDateLabel(iso: string | null | undefined): string {
  if (!iso) return '-';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Selisih dua ISO → "45 menit" / "1 jam 5 menit". `end` default = sekarang.
export function patrolDurationLabel(
  startIso: string | null | undefined,
  endIso?: string | null,
): string {
  if (!startIso) return '-';
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return '-';
  const totalMinutes = Math.round((end - start) / 60000);
  if (totalMinutes < 60) return `${totalMinutes} menit`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} jam` : `${hours} jam ${minutes} menit`;
}

// 0–100, dibulatkan, aman terhadap total 0.
export function patrolProgressPercent(completed: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

export function checkpointCountLabel(count: number): string {
  return `${count} checkpoint berurut`;
}

// Menit (mis. `duration_minutes` dari /patrols/monitoring) → "45 menit" / "1 jam 5 menit".
export function patrolMinutesLabel(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes) || minutes < 0) return '-';
  const total = Math.round(minutes);
  if (total < 60) return `${total} menit`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins === 0 ? `${hours} jam` : `${hours} jam ${mins} menit`;
}

// "-6.918210, 107.616900" — koordinat checkpoint apa adanya (6 desimal).
export function coordLabel(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export const patrolAccent = colors.success;

// `true` kalau sesi berjalan di rute ini milik user sendiri (dibanding sesi aktif yang diberikan) —
// tap-nya harus langsung ke layar "Sesi Berjalan" (patrolActive), bukan detail rute.
export function patrolRouteOngoingIsMine(
  route: PatrolRoute,
  ownSessionId?: number | null,
): boolean {
  const summary = route.status_summary;
  return (
    !!summary &&
    summary.ongoing_session_id != null &&
    summary.ongoing_session_id === ownSessionId
  );
}

// Rute terkunci = tidak bisa dipilih DAN sesi berjalannya milik anggota lain. Rute seperti ini
// tidak bisa dibuka/di-mulai. Rute `is_selectable` atau yang sesi berjalannya milik user sendiri
// tetap bisa dibuka.
export function isPatrolRouteLocked(route: PatrolRoute, ownSessionId?: number | null): boolean {
  const summary = route.status_summary;
  if (!summary || summary.is_selectable) return false;
  return !patrolRouteOngoingIsMine(route, ownSessionId);
}

// Keterangan kenapa sebuah rute tidak bisa dimulai sekarang (`status_summary.is_selectable === false`)
// — mis. ada anggota lain yang sedang berpatroli di rute itu. `null` kalau rute bisa dipilih.
export function patrolRouteBusyLabel(
  route: PatrolRoute,
  ownSessionId?: number | null,
): string | null {
  const summary = route.status_summary;
  if (!summary || summary.is_selectable) return null;
  if (patrolRouteOngoingIsMine(route, ownSessionId)) {
    return 'Anda sedang berpatroli di rute ini';
  }
  const officer = summary.ongoing_officer;
  const name = officer
    ? [officer.rank, officer.full_name]
        .map(value => (value ?? '').trim())
        .filter(Boolean)
        .join(' ')
    : '';
  return name
    ? `Sedang dipatroli oleh ${name}`
    : 'Anggota lain sedang berpatroli di rute ini';
}
