// Buku Saku (E-Book) — data nyata dari endpoint `/handbook/*` (lihat
// `src/services/api/handbook.service.ts`). Terdiri dari Bab (`HandbookChapter`) yang berisi
// daftar materi/halaman terurut (`HandbookArticleRef`); isi tiap halaman diambil terpisah
// lewat `GET /handbook/articles/{id}` → `HandbookArticleDetail`.

// `content`        → halaman materi biasa, Rich Text HTML di `content`. Backend lama mengirim
//                    `article` untuk jenis yang sama — keduanya diperlakukan identik.
// `record_display` → halaman data prajurit yang sedang membuka; isinya ditentukan `record_type`
//                    (`biodata` → field `biodata`, `ability:<id>` → field `ability_records`).
export type HandbookArticleType = 'content' | 'article' | 'record_display';

// Entri ringkas satu halaman di dalam daftar isi Bab (`GET /handbook/chapters`).
export interface HandbookArticleRef {
  id: number;
  title: string;
  page_number: number;
  type: HandbookArticleType;
  record_type: string | null;
}

export interface HandbookChapter {
  id: number;
  title: string;
  // Nama ikon dari backend (string bebas, mis. "shield") — dipetakan ke `IconName` lewat
  // `handbookIcon()` di `src/screens/BukuSaku/chapterIcon.ts`.
  icon: string;
  sort_order: number;
  articles_count: number;
  articles: HandbookArticleRef[];
}

// Halaman `record_type: "biodata"` — identitas prajurit yang sedang membuka. `position` ada di
// contoh kontrak tapi tidak selalu ikut di response asli.
export interface HandbookBiodata {
  personnel_id: number;
  name: string;
  nrp: string;
  rank: string | null;
  position?: string | null;
  unit: string | null;
  photo_url: string | null;
}

// `not_assessed` = belum pernah dinilai (value/submitted_value/assessment_date null).
export type HandbookAbilityStatus = 'approved' | 'pending' | 'revision' | 'not_assessed';

// `unit` kosong ("") untuk `level` / `pass_fail`.
export type HandbookValuationType = 'numeric' | 'count' | 'duration' | 'level' | 'pass_fail';

// Halaman `record_type: "ability:<id>"` — `ability_records` = RIWAYAT penilaian satu kemampuan,
// terbaru dulu (sejak 26 Sep 2026; sebelumnya satu entri + `history_count`). Kemampuan yang belum
// pernah dinilai → array kosong.
export interface HandbookAbilityRecord {
  ability_id: number;
  name: string;
  category: string | null;
  valuation_type: HandbookValuationType | string;
  unit: string | null;
  // Nilai yang diajukan prajurit.
  submitted_value: string | null;
  // Nilai akhir dari instruktur saat verifikasi — null selama belum ada / ditolak.
  final_value?: string | null;
  // Nilai terakhir yang berlaku (= final_value, atau submitted_value bila belum ada nilai akhir).
  value: string | null;
  status: HandbookAbilityStatus | string;
  assessment_date: string | null;
  // Nama instruktur penilai.
  instructor?: string | null;
  instructor_note: string | null;
  // Alasan penolakan (status `revision`).
  rejection_reason?: string | null;
  verified_at?: string | null;
  // Bentuk lama (satu entri) — tidak dikirim lagi.
  history_count?: number;
}

// Isi lengkap satu halaman (`GET /handbook/articles/{id}`). Hanya SATU dari `content` /
// `biodata` / `ability_records` yang terisi, sesuai `record_type`.
export interface HandbookArticleDetail {
  id: number;
  chapter_id: number;
  chapter_title: string;
  title: string;
  page_number: number;
  type: HandbookArticleType;
  record_type: string | null;
  // Rich Text HTML untuk halaman materi (URL gambar mengarah ke `/api/secure-files/...`).
  content: string | null;
  biodata?: HandbookBiodata | null;
  ability_records?: HandbookAbilityRecord[];
}
