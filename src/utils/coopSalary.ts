import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';
import type {
  CoopCategoryAmount,
  CoopCategoryKey,
  CoopCategoryRef,
  CoopTrendDirection,
} from '@/types';

// Helper tampilan Tagihan Koperasi (`/coop-salary-report/*`).

// Urutan kanonik tujuh jenis tagihan (sama seperti kolom di berkas rekap / web admin).
export const COOP_CATEGORY_ORDER: CoopCategoryKey[] = [
  'toko',
  'belanja_wajib',
  'sekunder',
  'air_prt_rudi',
  'usipa',
  'simpanan_wajib',
  'ukp',
];

const DEFAULT_LABELS: Record<CoopCategoryKey, string> = {
  toko: 'Toko',
  belanja_wajib: 'Belanja Wajib',
  sekunder: 'Sekunder',
  air_prt_rudi: 'Air PRT Rudi',
  usipa: 'USIPA',
  simpanan_wajib: 'Simpanan Wajib',
  ukp: 'UKP',
};

const CATEGORY_COLOR: Record<CoopCategoryKey, string> = {
  toko: colors.coopCategoryToko,
  belanja_wajib: colors.coopCategoryBelanjaWajib,
  sekunder: colors.coopCategorySekunder,
  air_prt_rudi: colors.coopCategoryAir,
  usipa: colors.coopCategoryUsipa,
  simpanan_wajib: colors.coopCategorySimpanan,
  ukp: colors.coopCategoryUkp,
};

export function coopCategoryColor(key: string): string {
  return CATEGORY_COLOR[key as CoopCategoryKey] ?? colors.placeholder;
}

export interface CoopCategoryLine {
  key: string;
  label: string;
  amount: number;
  amountLabel: string;
  color: string;
  // 0–100; 0 bila total 0.
  percent: number;
}

// Lengkapi daftar jadi tujuh jenis (urutan kanonik) — backend kadang hanya mengirim jenis yang
// bernilai. Jenis tak dikenal (bila backend menambah jenis baru) ditaruh di belakang.
export function coopCategoryLines(
  categories: CoopCategoryAmount[] | null | undefined,
  catalog?: CoopCategoryRef[] | null,
): CoopCategoryLine[] {
  const list = categories ?? [];
  const total = list.reduce((sum, item) => sum + (item.amount || 0), 0);
  const byKey = new Map(list.map(item => [item.key, item]));
  const labelFor = (key: string) =>
    catalog?.find(ref => ref.key === key)?.label ?? DEFAULT_LABELS[key as CoopCategoryKey] ?? key;

  const toLine = (key: string, item: CoopCategoryAmount | undefined): CoopCategoryLine => {
    const amount = item?.amount ?? 0;
    return {
      key,
      label: item?.label ?? labelFor(key),
      amount,
      amountLabel: item?.amount_formatted ?? formatRupiah(amount),
      color: coopCategoryColor(key),
      percent: total > 0 ? (amount / total) * 100 : 0,
    };
  };

  const known = COOP_CATEGORY_ORDER.map(key => toLine(key, byKey.get(key)));
  const extra = list
    .filter(item => !(COOP_CATEGORY_ORDER as string[]).includes(item.key))
    .map(item => toLine(item.key, item));
  return [...known, ...extra];
}

// Subjudul baris periode: jenis bernilai, terbesar dulu — "Toko · Simpanan Wajib", atau bila lebih
// dari dua "Toko · Belanja Wajib +5 lainnya" (daftar lengkap 7 jenis selalu terpotong di 1 baris).
export function coopCategorySummary(categories: CoopCategoryAmount[] | null | undefined): string | null {
  const names = (categories ?? [])
    .filter(item => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map(item => item.label);
  if (names.length === 0) return null;
  if (names.length <= 2) return names.join(' · ');
  return `${names.slice(0, 2).join(' · ')} +${names.length - 2} lainnya`;
}

const rupiahFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

// Untuk angka yang dihitung di klien (selisih dari trend) — nilai dari backend pakai
// `*_formatted` apa adanya. Format disamakan dengan backend: "Rp 150.000", "-Rp 150.000".
export function formatRupiah(value: number): string {
  const abs = rupiahFormatter.format(Math.abs(Math.round(value)));
  return value < 0 ? `-Rp ${abs}` : `Rp ${abs}`;
}

// Label ringkas untuk sumbu grafik: "Rp 192,4 jt" / "Rp 1,99 jt" / "Rp 1,2 M". Di bawah sejuta tetap
// penuh. Dibulatkan KE BAWAH (bukan ke terdekat) dan 2 desimal di bawah 10 — supaya Rp 1.995.000
// tidak tampil "Rp 2 jt" (terlihat sama dengan periode lain yang memang 2 juta lebih).
export function formatRupiahCompact(value: number): string {
  const abs = Math.abs(value);
  const short = (n: number) => {
    const digits = Math.abs(n) < 10 ? 2 : 1;
    const factor = 10 ** digits;
    const floored = Math.trunc(n * factor) / factor;
    return floored.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: digits });
  };
  if (abs >= 1_000_000_000) return `Rp ${short(value / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `Rp ${short(value / 1_000_000)} jt`;
  return formatRupiah(value);
}

// "37,5%" / "0,2%" / "12%".
export function formatPercent(value: number): string {
  return `${Math.abs(value).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
}

export interface CoopDelta {
  delta: number;
  percent: number;
  trend: CoopTrendDirection;
}

// Selisih dua nilai terakhir deret trend (kartu Home). null bila baru satu periode.
export function coopDeltaFromSeries(values: number[] | null | undefined): CoopDelta | null {
  if (!values || values.length < 2) return null;
  const current = values[values.length - 1];
  const previous = values[values.length - 2];
  const delta = current - previous;
  const percent = previous !== 0 ? (delta / previous) * 100 : 0;
  return { delta, percent, trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' };
}

export interface CoopTrendMeta {
  icon: IconName;
  color: string;
  surface: string;
  verb: string;
}

// Tagihan turun = kabar baik (hijau), naik = perlu perhatian (amber, bukan merah — bukan alarm).
export const COOP_TREND_META: Record<CoopTrendDirection, CoopTrendMeta> = {
  down: { icon: 'trending-down', color: colors.success, surface: colors.successSurface, verb: 'Turun' },
  up: { icon: 'trending-up', color: colors.warningText, surface: colors.warningSurface, verb: 'Naik' },
  flat: { icon: 'arrow-right', color: colors.textMuted, surface: colors.neutralSurface, verb: 'Sama' },
};

const MONTH_SHORT: Record<string, string> = {
  januari: 'Jan',
  februari: 'Feb',
  maret: 'Mar',
  april: 'Apr',
  mei: 'Mei',
  juni: 'Jun',
  juli: 'Jul',
  agustus: 'Agu',
  september: 'Sep',
  oktober: 'Okt',
  november: 'Nov',
  desember: 'Des',
};

// "Agustus 2026" → "Agu 2026" (label sumbu grafik).
export function shortPeriodLabel(label: string): string {
  const [month, ...rest] = label.split(' ');
  const short = MONTH_SHORT[month?.toLowerCase() ?? ''];
  return short ? [short, ...rest].join(' ') : label;
}

// Chip tanggal di baris periode: { month: 'SEP', year: '2026' }.
export function periodChipParts(monthLabel: string, year: number | string): { month: string; year: string } {
  const short = MONTH_SHORT[monthLabel.toLowerCase()] ?? monthLabel.slice(0, 3);
  return { month: short.toUpperCase(), year: String(year) };
}

// Bar tren: ubah deret angka jadi item siap gambar (bar terakhir = periode terbaru, disorot).
export function trendBarItems(
  labels: string[] | null | undefined,
  values: number[] | null | undefined,
  sublabels?: string[],
) {
  const safeValues = values ?? [];
  return (labels ?? []).map((label, index) => ({
    key: `${label}-${index}`,
    label: shortPeriodLabel(label),
    value: safeValues[index] ?? 0,
    valueLabel: formatRupiahCompact(safeValues[index] ?? 0),
    sublabel: sublabels?.[index],
  }));
}
