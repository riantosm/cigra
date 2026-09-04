import axios from 'axios';

// Normalisasi "tidak ada isi": null / undefined / string kosong / whitespace / placeholder "-"
// (backend kerap mengirim "-" atau "–" untuk field kosong) → null. Semua helper format lain
// dibangun di atas ini supaya "-" tidak pernah ikut tampil sebagai data.
export function cleanValue(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === '-' || trimmed === '–' || trimmed === '—') return null;
  return trimmed;
}

export function orDash(value: string | null | undefined): string {
  return cleanValue(value) ?? '-';
}

export function genderLabel(gender: string | null | undefined): string {
  if (gender === 'male') return 'Laki-laki';
  if (gender === 'female') return 'Perempuan';
  if (!gender) return '-';
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

// Ubah value mentah dari API (mis. "orang_tua", "SIAP_PAKAI") jadi Title Case berspasi
// ("Orang Tua", "Siap Pakai") — dipakai buat field enum-like (family_relation, condition_status,
// inventory_status, category, ownership_type) yang tampil sebagai teks ke user.
export function titleCase(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Gabungkan beberapa field opsional dengan " · ", tapi lewati field yang kosong sepenuhnya —
// dipakai di subtitle list (mis. "Pangkat · Satuan") supaya field yang null tidak muncul sebagai
// "-" dan pemisah "·" cuma tampil kalau kedua sisinya benar-benar ada isinya.
export function joinFields(...values: (string | null | undefined)[]): string {
  return values
    .map(cleanValue)
    .filter((value): value is string => value !== null)
    .join(' · ');
}

export function formatBirth(place: string | null | undefined, dateFormatted: string | null | undefined): string {
  const cleanPlace = cleanValue(place);
  const cleanDate = cleanValue(dateFormatted);
  if (cleanPlace && cleanDate) return `${cleanPlace}, ${cleanDate}`;
  return cleanPlace ?? cleanDate ?? '-';
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Return null (bukan '-') kalau kosong — dipakai di tempat yang mau menyembunyikan baris intinya
// kalau datanya tidak ada (mis. "Terakhir diperbarui" di Profile), bukan menampilkan dash.
export function formatDateTime(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  const datePart = parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const timePart = parsed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

// Jarak waktu relatif dalam Bahasa Indonesia dengan granularitas detik → menit → jam → hari →
// minggu → bulan → tahun ("5 detik lalu", "3 menit lalu", "2 hari lalu", "1 minggu lalu", ...).
// Pakai floor supaya "5 detik lalu" muncul persis di detik ke-5, cocok untuk badge yang tick
// tiap detik (lihat useSecondsTick + LocationStatusBadge).
export function formatRelativeTime(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  const diffSec = Math.floor((Date.now() - parsed.getTime()) / 1000);
  if (diffSec < 1) return 'baru saja';
  if (diffSec < 60) return `${diffSec} detik lalu`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} minggu lalu`;

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} bulan lalu`;

  return `${Math.floor(diffMonth / 12)} tahun lalu`;
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}
