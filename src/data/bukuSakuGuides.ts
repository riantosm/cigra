import type { BukuSakuGuide } from '@/types';

// Data dummy Buku Saku — dipakai layar BukuSaku (daftar) & BukuSakuDetail sampai endpoint
// `/buku-saku` tersedia. Isi detail sengaja hanya berupa lampiran (tanpa badan artikel),
// sesuai revisi desain "Buku Saku — Detail Panduan".
export const BUKU_SAKU_GUIDES: BukuSakuGuide[] = [
  {
    id: 'apel-upacara',
    title: 'Tata Cara Apel & Upacara',
    category: 'Ketentuan Dasar',
    icon: 'handbook',
    readMinutes: 6,
    updatedAt: '2026-08-28',
    authorName: 'Staf Provos Batalyon',
    attachments: [
      {
        id: 'apel-sop',
        fileName: 'SOP-Apel-dan-Upacara-2026.pdf',
        fileType: 'PDF',
        fileSize: '1,2 MB',
        url: 'https://example.com/buku-saku/SOP-Apel-dan-Upacara-2026.pdf',
      },
      {
        id: 'apel-denah',
        fileName: 'Denah-Formasi-Barisan-Apel.pdf',
        fileType: 'PDF',
        fileSize: '680 KB',
        url: 'https://example.com/buku-saku/Denah-Formasi-Barisan-Apel.pdf',
      },
    ],
  },
  {
    id: 'seragam-atribut',
    title: 'Penggunaan Seragam & Atribut',
    category: 'Ketentuan Dasar',
    icon: 'shield-check',
    readMinutes: 4,
    updatedAt: '2026-08-20',
    authorName: 'Staf Provos Batalyon',
    attachments: [
      {
        id: 'seragam-pedoman',
        fileName: 'Pedoman-Guntar-dan-Atribut.pdf',
        fileType: 'PDF',
        fileSize: '2,1 MB',
        url: 'https://example.com/buku-saku/Pedoman-Guntar-dan-Atribut.pdf',
      },
    ],
  },
  {
    id: 'izin-cuti-dinas-luar',
    title: 'Prosedur Izin, Cuti & Dinas Luar',
    category: 'Administrasi',
    icon: 'briefcase',
    readMinutes: 5,
    updatedAt: '2026-08-15',
    authorName: 'Staf Personel (S-1)',
    attachments: [
      {
        id: 'izin-formulir',
        fileName: 'Formulir-Pengajuan-Izin-Cuti.pdf',
        fileType: 'PDF',
        fileSize: '320 KB',
        url: 'https://example.com/buku-saku/Formulir-Pengajuan-Izin-Cuti.pdf',
      },
      {
        id: 'izin-alur',
        fileName: 'Alur-Persetujuan-Dinas-Luar.pdf',
        fileType: 'PDF',
        fileSize: '540 KB',
        url: 'https://example.com/buku-saku/Alur-Persetujuan-Dinas-Luar.pdf',
      },
    ],
  },
  {
    id: 'pengamanan-markas',
    title: 'Pengamanan Markas & Pos Jaga',
    category: 'Operasional',
    icon: 'shield-check',
    readMinutes: 8,
    updatedAt: '2026-08-25',
    authorName: 'Staf Operasi (S-3)',
    attachments: [
      {
        id: 'jaga-protap',
        fileName: 'Protap-Pos-Jaga-dan-Patroli.pdf',
        fileType: 'PDF',
        fileSize: '1,6 MB',
        url: 'https://example.com/buku-saku/Protap-Pos-Jaga-dan-Patroli.pdf',
      },
    ],
  },
  {
    id: 'komunikasi-radio',
    title: 'Komunikasi Radio & Sandi Satuan',
    category: 'Operasional',
    icon: 'broadcast',
    readMinutes: 7,
    updatedAt: '2026-08-18',
    authorName: 'Staf Komunikasi & Elektronika',
    attachments: [
      {
        id: 'radio-panduan',
        fileName: 'Panduan-Prosedur-Radio-Telepon.pdf',
        fileType: 'PDF',
        fileSize: '980 KB',
        url: 'https://example.com/buku-saku/Panduan-Prosedur-Radio-Telepon.pdf',
      },
      {
        id: 'radio-sandi',
        fileName: 'Daftar-Sandi-Angka-dan-Fonetik.pdf',
        fileType: 'PDF',
        fileSize: '210 KB',
        url: 'https://example.com/buku-saku/Daftar-Sandi-Angka-dan-Fonetik.pdf',
      },
    ],
  },
  {
    id: 'p3k-lapangan',
    title: 'Pertolongan Pertama (P3K) Lapangan',
    category: 'Kesehatan & Keselamatan',
    icon: 'heartbeat',
    readMinutes: 6,
    updatedAt: '2026-08-30',
    authorName: 'Tim Kesehatan Batalyon',
    attachments: [
      {
        id: 'p3k-modul',
        fileName: 'Modul-P3K-Lapangan-Dasar.pdf',
        fileType: 'PDF',
        fileSize: '3,4 MB',
        url: 'https://example.com/buku-saku/Modul-P3K-Lapangan-Dasar.pdf',
      },
    ],
  },
];

export function findBukuSakuGuide(id: string): BukuSakuGuide | undefined {
  return BUKU_SAKU_GUIDES.find(guide => guide.id === id);
}
