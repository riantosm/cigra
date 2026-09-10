// Prakiraan Cuaca BMKG — GET /weather (publik, sumber data resmi BMKG).
// Backend membungkus payload BMKG di dalam `data` (ada `data.success` lagi di dalamnya).
// Field di sini = persis yang dikirim backend; atribusi "BMKG" WAJIB tampil di UI.

export interface WeatherLocation {
  adm1: string | null;
  adm2: string | null;
  adm3: string | null;
  adm4: string | null;
  desa: string | null;
  kecamatan: string | null;
  kotkab: string | null;
  provinsi: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string | null;
  formatted_address: string | null;
  is_current_location: boolean;
  // 'gps' | 'adm4' | 'base' — sumber penentuan lokasi.
  source_type: string | null;
  source_label: string | null;
}

export interface WeatherPoint {
  datetime: string;
  local_datetime: string;
  time_label: string;
  date_label: string;
  weather_desc: string;
  weather_desc_en: string;
  temp: number;
  temp_unit: string;
  humidity: number;
  humidity_unit: string;
  wind_speed: number;
  wind_speed_unit: string;
  wind_direction: string;
  visibility: string;
  icon_url: string | null;
}

export interface WeatherForecastDay {
  day_index: number;
  day_label: string;
  date: string;
  items: WeatherPoint[];
}

export interface WeatherForecast {
  success: boolean;
  cached_at: string | null;
  location: WeatherLocation;
  current: WeatherPoint;
  forecast_days: WeatherForecastDay[];
  attribution: string;
}

// GET /weather/regions & /weather/reverse-geocode — dipakai untuk pencarian/autocomplete lokasi
// (belum ada layar pemilih lokasi; disiapkan untuk nanti).
export interface WeatherRegion {
  adm4: string;
  desa: string | null;
  kecamatan: string | null;
  kotkab: string | null;
  provinsi: string | null;
  lat: number | null;
  lon: number | null;
  distance_km?: number;
}

// GET /weather/alerts — Peringatan Dini Cuaca Ekstrem BMKG (CAP Alert Nowcast).
export type WeatherAlertSeverity = 'warning' | 'danger';

export interface WeatherAlert {
  title: string;
  // Tautan XML CAP resmi BMKG.
  link: string;
  guid: string;
  pub_date_raw: string;
  pub_date_formatted: string;
  pub_date_iso: string;
  author: string;
  description: string;
  severity: WeatherAlertSeverity;
  badge_class: string;
  icon: string;
}

export interface WeatherAlertFeed {
  channel_title: string;
  channel_link: string;
  channel_description: string;
  total: number;
  items: WeatherAlert[];
  cached_at: string | null;
  attribution: string;
}
