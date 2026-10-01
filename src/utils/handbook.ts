import type { IconName } from '@/components/atoms/Icon';
import type { BadgeVariant } from '@/components/atoms/Badge';
import type {
  HandbookAbilityRecord,
  HandbookArticleDetail,
  HandbookArticleRef,
  HandbookChapter,
} from '@/types';
import { cleanValue, titleCase } from '@/utils/format';

// Jenis halaman Buku Saku, diturunkan dari `type` + `record_type`.
export type HandbookPageKind = 'content' | 'biodata' | 'ability' | 'record';

type PageLike = Pick<HandbookArticleRef, 'type' | 'record_type'>;

export function handbookPageKind(page: PageLike): HandbookPageKind {
  if (page.type !== 'record_display') return 'content';
  if (page.record_type === 'biodata') return 'biodata';
  if (page.record_type?.startsWith('ability:')) return 'ability';
  return 'record';
}

// Kicker di atas judul halaman (kartu halaman `BukuSakuDetail`).
export const HANDBOOK_PAGE_KICKER: Record<HandbookPageKind, string> = {
  content: 'MATERI',
  biodata: 'BIODATA',
  ability: 'REKAM NILAI',
  record: 'REKAM DATA',
};

// Keterangan kecil di bawah judul baris daftar isi / hasil pencarian.
export const HANDBOOK_PAGE_META: Record<HandbookPageKind, string> = {
  content: 'Materi',
  biodata: 'Biodata',
  ability: 'Rekam nilai',
  record: 'Rekam data',
};

// Bab yang berisi halaman data prajurit (biodata / rekam nilai) diberi label di daftar bab.
export function chapterHasRecords(chapter: HandbookChapter): boolean {
  return chapter.articles.some(article => article.type === 'record_display');
}

export function sortedPages(chapter: HandbookChapter): HandbookArticleRef[] {
  return [...chapter.articles].sort((a, b) => a.page_number - b.page_number);
}

// Riwayat penilaian yang benar-benar ada (entri `not_assessed` bentuk lama dibuang), terbaru dulu.
export function abilityHistory(article: HandbookArticleDetail): HandbookAbilityRecord[] {
  return (article.ability_records ?? [])
    .filter(record => record.status !== 'not_assessed')
    .sort((a, b) => (b.assessment_date ?? '').localeCompare(a.assessment_date ?? ''));
}

// Nilai akhir dari instruktur. Bentuk lama tidak punya `final_value` — di sana `value` = nilai akhir.
export function abilityFinalValue(record: HandbookAbilityRecord): string | null {
  return 'final_value' in record ? record.final_value ?? null : record.value;
}

// "NILAI — Lari 12 Menit" → "Lari 12 Menit" — nama kemampuan saat `ability_records` kosong.
export function abilityNameFromTitle(title: string): string {
  return title.replace(/^NILAI\s*[—–-]\s*/i, '').trim() || title;
}

export interface AbilityStatusMeta {
  label: string;
  variant: BadgeVariant;
  icon: IconName;
}

// Status penilaian → badge. `not_assessed` tidak punya badge (halaman menampilkan state kosong).
const ABILITY_STATUS_META: Record<string, AbilityStatusMeta> = {
  approved: { label: 'Terverifikasi', variant: 'success', icon: 'check' },
  pending: { label: 'Menunggu Verifikasi', variant: 'warning', icon: 'clock' },
  revision: { label: 'Perlu Revisi', variant: 'danger', icon: 'alert-triangle' },
};

export function abilityStatusMeta(status: string): AbilityStatusMeta {
  return (
    ABILITY_STATUS_META[status] ?? {
      label: titleCase(status) ?? status,
      variant: 'neutral',
      icon: 'info',
    }
  );
}

// `level` / `pass_fail` bernilai teks (mis. "baik", "lulus"), bukan angka.
export function isTextValuation(record: HandbookAbilityRecord): boolean {
  return record.valuation_type === 'level' || record.valuation_type === 'pass_fail';
}

// Nilai kemampuan apa adanya; nilai teks dirapikan jadi Title Case ("tidak_lulus" → "Tidak Lulus").
export function formatAbilityValue(record: HandbookAbilityRecord, value: string | null): string | null {
  const cleaned = cleanValue(value);
  if (!cleaned) return null;
  return isTextValuation(record) ? titleCase(cleaned) : cleaned;
}

// Nilai berupa angka / waktu ("2450", "1.200", "12:30"). Hanya nilai seperti ini yang ditempeli
// satuan — nilai teks ("Baik", "Helm, rompi taktis, …") dengan satuan "tingkat"/"daftar" janggal.
const NUMERIC_VALUE = /^[\d\s.,:+\-/]+$/;

export function isNumericAbilityValue(value: string): boolean {
  return NUMERIC_VALUE.test(value);
}

// Ukuran tampilan nilai: angka besar, teks pendek (mis. "Tidak Lulus") sedang, teks panjang (daftar
// perlengkapan, uraian) jadi paragraf yang membungkus.
export type AbilityValueSize = 'number' | 'short' | 'long';

const SHORT_TEXT_MAX = 16;

export function abilityValueSize(value: string): AbilityValueSize {
  if (isNumericAbilityValue(value)) return 'number';
  return value.length <= SHORT_TEXT_MAX ? 'short' : 'long';
}

// "12 tahun" / "2 th 4 bln" / "5 bln" / "< 1 bln" dari tanggal mulai — dipakai "Lama menjabat".
export function tenureLabel(startDate: string | null | undefined, now: Date = new Date()): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return null;
  if (months < 1) return '< 1 bln';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} bln`;
  return rest === 0 ? `${years} tahun` : `${years} th ${rest} bln`;
}

// Umur dalam tahun penuh dari tanggal lahir.
export function ageInYears(birthDate: string | null | undefined, now: Date = new Date()): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}
