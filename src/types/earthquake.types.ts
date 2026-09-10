// Gempa Bumi BMKG (InaTEWS) — GET /earthquake/latest | /recent | /felt.

// Bidang bersama untuk /recent (M 5.0+) & /felt (dirasakan). Sebagian opsional karena
// tiap endpoint mengisi subset yang berbeda.
export interface EarthquakeItem {
  tanggal: string;
  jam: string;
  datetime_utc?: string | null;
  magnitude: number;
  kedalaman: string;
  wilayah: string;
  potensi: string;
  is_tsunami_potential?: boolean;
  dirasakan?: string | null;
  lintang?: string | null;
  bujur?: string | null;
  coordinates?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// GET /earthquake/latest — autogempa real-time, lengkap dengan Shakemap & klasifikasi level.
export interface EarthquakeLatest extends EarthquakeItem {
  formatted_date: string;
  formatted_time: string;
  is_tsunami_potential: boolean;
  shakemap_image: string | null;
  // 'warning' (M 5.0+) dst.
  level: string;
  level_badge: string;
  level_label: string;
  attribution: string;
}
