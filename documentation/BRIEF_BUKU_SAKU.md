# Brief: Fitur Buku Saku (E-Book)

> Ringkasan fitur "Buku Saku" untuk keperluan internal (onboarding, QA, atau diteruskan ke pihak lain).
> Sumber: kode di `src/screens/BukuSaku`, `src/screens/BukuSakuDetail`, `src/services/api/handbook.service.ts`,
> dan `documentation/API_CONTRACT.md` §9. Terakhir ditulis: 2026-09-19.

## 1. Apa itu Buku Saku

Buku Saku adalah modul **pedoman/materi satuan berbentuk E-Book** di dalam aplikasi Smart Battalion.
Isinya diatur backend sebagai **Bab** (chapter), dan tiap Bab berisi beberapa **halaman/materi**
(article) yang dibaca berurutan seperti buku digital — bukan daftar artikel lepas.

Dipakai oleh **semua peran** (anggota, komandan, petugas kesehatan) — tidak ada gating role.

## 2. Cara mengakses (entry point)

Ada 3 jalan masuk, semuanya menuju layar yang sama (`ROUTES.bukuSaku`):

1. **Tab bar utama** — tab "Buku Saku" (bottom tab ke-4 dari 5: Home · Riwayat · Emergency · **Buku Saku** · Academy).
2. **Quick Action "Buku Saku"** di `CommanderHome` (grid Quick Action komandan).
3. **Shortcut "Buku Saku"** di baris "Akses Cepat" `MemberHome`.

## 3. Alur pengguna (flow)

```
Tab "Buku Saku" (list Bab)
   │  GET /handbook/chapters
   │
   ├─ cari bab/materi (search box, client-side)
   │
   ▼
Ketuk salah satu Bab
   │  navigate → BukuSakuDetail { chapter }  (seluruh chapter, termasuk daftar articles,
   │                                            dikirim lewat params — tidak perlu fetch ulang)
   ▼
BukuSakuDetail (baca 1 halaman per layar, gaya E-Book)
   │  GET /handbook/articles/{id}   ← fetch ulang setiap pindah halaman
   │
   ├─ tombol "Sebelumnya" / "Selanjutnya" → pindah index halaman dalam chapter yang sama
   │     (disabled otomatis di halaman pertama/terakhir)
   │
   └─ back → kembali ke daftar Bab
```

### 3.1 Layar 1 — Daftar Bab (`src/screens/BukuSaku/index.tsx`)

- Header standar (`HomeHeader`: avatar → Profile, lonceng → Notifications).
- Judul "Buku Saku" + subjudul "Pedoman & materi satuan untuk prajurit".
- Search box (`SearchFilterBar`) — filter **client-side**, mencocokkan judul Bab **atau** judul
  halaman di dalamnya (jadi mengetik nama sub-materi tetap memunculkan Bab induknya).
- List "DAFTAR BAB": tiap baris = ikon bab + judul + "`N` halaman" + chevron.
  - Ikon dipetakan dari string bebas backend (`chapter.icon`, mis. `"shield"`) via `handbookIcon()`
    — fallback ke ikon generik `handbook` kalau nama ikon tidak dikenal.
  - Urutan bab mengikuti `sort_order` dari backend (di-sort ulang di FE untuk jaga-jaga).
- Pull-to-refresh untuk memuat ulang daftar.
- State kosong: "Belum ada materi" (data kosong) atau "Tidak ditemukan" (hasil pencarian kosong).
- State error: pesan error dari API ditampilkan di `EmptyState`.

### 3.2 Layar 2 — Baca Halaman (`src/screens/BukuSakuDetail/index.tsx`)

- Root-stack screen (bukan tab), dibuka dengan `navigation.navigate(ROUTES.bukuSakuDetail, { chapter })`
  — **seluruh chapter** (termasuk daftar `articles[]`) dibawa lewat route params, jadi navigasi
  next/back di dalam satu Bab **tidak perlu memanggil ulang** `GET /handbook/chapters`.
- Header (`MainLayout variant="canvas"`): judul = nama Bab, subjudul = "Halaman `X` dari `N`".
- Isi halaman di-fetch **satu per satu** lewat `GET /handbook/articles/{id}` setiap kali pindah
  halaman (bukan sekali di awal) — supaya konten selalu terbaru dan payload chapter tetap ringan.
- Dua jenis halaman (`type`):
  - **`article`** — halaman normal, isi HTML Rich Text dirender lewat `RichTextContent`
    (parser HTML custom, tanpa WebView) — mendukung paragraf, heading h1–h6, list, blockquote, bold/italic/
    underline/strikethrough, link, gambar (`img` → dirender via `SecureImage` dengan header Authorization,
    karena URL gambar mengarah ke `/api/secure-files/...`), dan garis pemisah.
  - **`record_display`** — halaman "penanda" untuk menampilkan rekam data pribadi prajurit (misal
    `record_type: "personnel_biodata"`). **Belum ada tampilan datanya di app** — hanya kartu placeholder
    berisi jenis record + catatan "Tampilan data untuk halaman ini belum tersedia di aplikasi."
- Navigasi footer (pinned di bawah, di luar area scroll): tombol **"Sebelumnya"** (ghost) dan
  **"Selanjutnya"** (primary), otomatis disabled di ujung pertama/terakhir chapter.
- Scroll otomatis kembali ke atas setiap pindah halaman.
- Loading/error state per halaman: spinner saat memuat, kartu error + tombol "Coba lagi" kalau gagal.

## 4. Data & API

| Endpoint | Dipakai di | Keterangan |
|---|---|---|
| `GET /handbook/chapters` | `BukuSakuScreen` (mount + pull-to-refresh) | Tanpa parameter, sudah terfilter per tenant di backend. Mengembalikan seluruh daftar isi (semua Bab + semua halaman ringkas di dalamnya) sekaligus. |
| `GET /handbook/articles/{id}` | `BukuSakuDetailScreen` (tiap pindah halaman) | `{id}` = `HandbookArticleRef.id` dari response di atas. Mengembalikan isi lengkap 1 halaman. |

Tipe (`src/types/bukuSaku.types.ts`):

```ts
type HandbookArticleType = 'article' | 'record_display';

interface HandbookArticleRef {   // ringkas, muncul di dalam HandbookChapter.articles[]
  id: number;
  title: string;
  page_number: number;
  type: HandbookArticleType;
  record_type: string | null;
}

interface HandbookChapter {
  id: number;
  title: string;
  icon: string;            // string bebas dari backend, mis. "shield"
  sort_order: number;
  articles_count: number;
  articles: HandbookArticleRef[];
}

interface HandbookArticleDetail {  // dari GET /handbook/articles/{id}
  id: number;
  chapter_id: number;
  chapter_title: string;
  title: string;
  page_number: number;
  type: HandbookArticleType;
  record_type: string | null;
  content: string | null;  // HTML, null untuk record_display
}
```

Tidak ada Redux slice untuk modul ini — semua state (daftar bab, index halaman aktif, isi halaman)
disimpan lokal per layar (`useState`), sama seperti pola RollCall/Patroli/Disposisi Surat.

## 5. File terkait

- `src/screens/BukuSaku/index.tsx` — layar daftar Bab (tab).
- `src/screens/BukuSaku/chapterIcon.ts` — pemetaan `icon` string backend → `IconName`.
- `src/screens/BukuSakuDetail/index.tsx` — layar baca halaman (root-stack).
- `src/services/api/handbook.service.ts` — 2 pemanggilan API di atas.
- `src/types/bukuSaku.types.ts` — tipe data (barrel via `src/types/index.ts`).
- `src/components/molecules/RichTextContent/index.tsx` — renderer HTML → komponen RN untuk `type: 'article'`.
- `documentation/API_CONTRACT.md` §9 — kontrak API detail + contoh response JSON.

## 6. Keterbatasan saat ini

- Halaman `record_display` (mis. biodata prajurit) **belum punya tampilan data** di app — masih
  sebatas kartu penanda. Perlu keputusan desain + endpoint tambahan kalau mau ditampilkan sungguhan.
- Tidak ada bookmark / "lanjutkan dari terakhir dibaca" — setiap membuka sebuah Bab selalu mulai dari
  halaman pertama (kecuali dibuka dengan `initialArticleId` lewat deep-link, yang saat ini tidak ada
  pemanggilnya di kode).
- Tidak ada mode offline / cache — tiap halaman selalu fetch ulang ke server saat dibuka.
- Tidak ada lampiran/unduhan file terpisah di halaman materi (gambar inline via Rich Text sudah
  didukung, tapi tidak ada slot lampiran seperti di modul Disposisi Surat).
