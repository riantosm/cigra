import { colors } from '@/theme/colors';
import type { BukuSakuCategory } from '@/types';

// Warna chip per kategori Buku Saku — dipakai baris ikon di daftar (BukuSaku) dan pill kategori
// di detail (BukuSakuDetail). `surface` = latar chip, `content` = warna ikon/teks di atasnya.
export interface BukuSakuCategoryMeta {
  surface: string;
  content: string;
}

const CATEGORY_META: Record<BukuSakuCategory, BukuSakuCategoryMeta> = {
  'Ketentuan Dasar': { surface: colors.chipSurface, content: colors.primary },
  Administrasi: { surface: colors.warningSurface, content: colors.warningText },
  Operasional: { surface: colors.skySurface, content: colors.skyText },
  'Kesehatan & Keselamatan': { surface: colors.dangerSurface, content: colors.danger },
};

export function categoryMeta(category: BukuSakuCategory): BukuSakuCategoryMeta {
  return CATEGORY_META[category] ?? CATEGORY_META['Ketentuan Dasar'];
}
