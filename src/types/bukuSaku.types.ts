import type { IconName } from '@/components/atoms/Icon';

// Buku Saku — panduan & ketentuan satuan untuk prajurit. Data masih dummy (lihat
// `src/data/bukuSakuGuides.ts`); nanti diganti endpoint `/buku-saku` begitu backend siap.

export type BukuSakuCategory =
  | 'Ketentuan Dasar'
  | 'Administrasi'
  | 'Operasional'
  | 'Kesehatan & Keselamatan';

export interface BukuSakuAttachment {
  id: string;
  // Nama berkas apa adanya (dengan ekstensi) — ditampilkan sebagai judul baris lampiran.
  fileName: string;
  // Label tipe berkas, mis. "PDF".
  fileType: string;
  // Ukuran berkas yang sudah diformat, mis. "1,2 MB".
  fileSize: string;
  // URL unduhan. Masih dummy — tombol "Unduh" belum benar-benar mengunduh apa pun.
  url: string;
}

export interface BukuSakuGuide {
  id: string;
  title: string;
  category: BukuSakuCategory;
  // Ikon yang mewakili panduan di baris daftar (chip warnanya dari `category`).
  icon: IconName;
  // Estimasi lama baca dalam menit — dipakai di baris meta ("6 menit baca").
  readMinutes: number;
  // Tanggal pembaruan terakhir (ISO-8601, tanggal saja).
  updatedAt: string;
  // Penyusun panduan — ditampilkan di kaki halaman detail.
  authorName: string;
  attachments: BukuSakuAttachment[];
}
