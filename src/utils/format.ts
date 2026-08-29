import axios from 'axios';

export function orDash(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : '-';
}

export function genderLabel(gender: string | null | undefined): string {
  if (gender === 'male') return 'Laki-laki';
  if (gender === 'female') return 'Perempuan';
  if (!gender) return '-';
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

export function formatBirth(place: string | null | undefined, dateFormatted: string | null | undefined): string {
  if (place && dateFormatted) return `${place}, ${dateFormatted}`;
  return orDash(place || dateFormatted);
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

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}
