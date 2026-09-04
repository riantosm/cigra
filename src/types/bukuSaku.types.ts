// Buku Saku (E-Book) — data nyata dari endpoint `/handbook/*` (lihat
// `src/services/api/handbook.service.ts`). Terdiri dari Bab (`HandbookChapter`) yang berisi
// daftar materi/halaman terurut (`HandbookArticleRef`); isi tiap halaman diambil terpisah
// lewat `GET /handbook/articles/{id}` → `HandbookArticleDetail`.

// `article`       → halaman berisi Rich Text HTML (`content`).
// `record_display`→ halaman penanda tampilan rekam nilai prajurit (mis. biodata) — `record_type`
//                    menyebut jenisnya; belum ada tampilan datanya di app.
export type HandbookArticleType = 'article' | 'record_display';

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

// Isi lengkap satu halaman (`GET /handbook/articles/{id}`).
export interface HandbookArticleDetail {
  id: number;
  chapter_id: number;
  chapter_title: string;
  title: string;
  page_number: number;
  type: HandbookArticleType;
  record_type: string | null;
  // Rich Text HTML untuk `type === 'article'` (URL gambar mengarah ke `/api/secure-files/...`).
  // null untuk `record_display`.
  content: string | null;
}
