import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';
import type {
  CoopCategoryAmount,
  CoopCategoryKey,
  CoopCategoryRef,
  CoopOverview,
  CoopTrendDirection,
} from '@/types';

// Helper tampilan Tagihan Koperasi (`/coop-salary-report/*`).

// Tampilan pengelola (rekap satuan) hanya bila backend memberi hak rekap: `mode` = `manager`,
// `capabilities.can_view_all_reports` tidak false, dan blok `manager` terisi. Jangan memutuskan dari
// ada-tidaknya blok `manager` saja — akun yang role Juyar-nya baru dicabut bisa masih menerima blok
// itu padahal `mode` sudah `member` (dipakai menu `Coop` dan kartu Tagihan Koperasi di kedua Home).
export function isCoopManagerView(overview: CoopOverview | null | undefined): boolean {
  if (!overview?.manager) return false;
  if (overview.mode !== 'manager') return false;
  return overview.capabilities?.can_view_all_reports !== false;
}

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

// Label pill selisih: "-Rp 150.000 · -37,5%" (turun) / "+Rp 50.000 · +12%" (naik).
export function coopDeltaPillLabel(delta: CoopDelta): string {
  if (delta.trend === 'flat') return 'Tetap';
  const sign = delta.delta < 0 ? '-' : '+';
  return `${sign}${formatRupiah(Math.abs(delta.delta))} · ${sign}${formatPercent(delta.percent)}`;
}

// Kalimat selisih di bawah nominal: "Turun Rp 150.000 dari Agustus 2026". Periode pertama →
// "Periode pertama yang tercatat".
export function coopDeltaSentence(delta: CoopDelta | null, previousLabel: string | null | undefined): string {
  if (!delta || !previousLabel) return 'Periode pertama yang tercatat';
  if (delta.trend === 'flat') return `Sama dengan ${previousLabel}`;
  return `${COOP_TREND_META[delta.trend].verb} ${formatRupiah(Math.abs(delta.delta))} dari ${previousLabel}`;
}

// --- `tagihan_koperasi` di detail personel (`GET /catalog/personnel/{id}`) ---

export interface CoopPersonnelPeriodView {
  key: string;
  label: string;
  monthShort: string;
  year: string;
  total: number;
  totalLabel: string;
  categories: CoopCategoryAmount[];
}

type Loose = Record<string, unknown>;

function isLoose(value: unknown): value is Loose {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function looseNumber(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function looseString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

// Nominal per jenis bisa berupa array `{key,label,amount,amount_formatted}` (sama seperti `/me`)
// atau peta `{ toko: 150000 }` / `{ toko: { amount, amount_formatted } }` — dua-duanya diterima.
function looseCategoryAmounts(value: unknown, catalog?: CoopCategoryRef[] | null): CoopCategoryAmount[] {
  const labelFor = (key: string) =>
    catalog?.find(ref => ref.key === key)?.label ?? DEFAULT_LABELS[key as CoopCategoryKey] ?? key;
  const toAmount = (key: string, item: unknown): CoopCategoryAmount => {
    const record = isLoose(item) ? item : {};
    const amount = looseNumber(isLoose(item) ? record.amount ?? record.total : item);
    return {
      key,
      label: looseString(record.label) ?? labelFor(key),
      amount,
      amount_formatted: looseString(record.amount_formatted) ?? formatRupiah(amount),
    };
  };
  if (Array.isArray(value)) {
    return value.filter(isLoose).map(item => toAmount(String(item.key ?? ''), item));
  }
  if (isLoose(value)) return Object.entries(value).map(([key, item]) => toAmount(key, item));
  return [];
}

// Periode tagihan personel → siap tampil, terbaru dulu (bila bulan/tahun tersedia untuk diurut).
export function normalizePersonnelCoopPeriods(
  periods: Loose[] | null | undefined,
  catalog?: CoopCategoryRef[] | null,
): CoopPersonnelPeriodView[] {
  const items = (periods ?? []).filter(isLoose).map((raw, index) => {
    const period = isLoose(raw.period) ? raw.period : {};
    const label =
      looseString(period.label) ?? looseString(raw.period_label) ?? looseString(raw.label) ?? `Periode ${index + 1}`;
    const monthLabel = looseString(period.month_label) ?? label.split(' ')[0] ?? '';
    const year = String(period.year ?? raw.period_year ?? label.split(' ').slice(-1)[0] ?? '');
    const chip = periodChipParts(monthLabel, year);
    const total = looseNumber(raw.total ?? raw.total_amount);
    return {
      sortKey: looseNumber(period.year ?? raw.period_year) * 100 + looseNumber(period.month ?? raw.period_month),
      view: {
        key: String(raw.id ?? raw.row_id ?? `${label}-${index}`),
        label,
        monthShort: chip.month,
        year: chip.year,
        total,
        totalLabel: looseString(raw.total_formatted) ?? looseString(raw.total_amount_formatted) ?? formatRupiah(total),
        categories: looseCategoryAmounts(raw.categories, catalog),
      },
    };
  });
  const sortable = items.every(item => item.sortKey > 100);
  if (sortable) items.sort((a, b) => b.sortKey - a.sortKey);
  return items.map(item => item.view);
}
