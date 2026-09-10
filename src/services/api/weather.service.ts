import { axiosInstance } from '@/services/api/axiosInstance';
import type { ApiResponse, WeatherForecast, WeatherRegion } from '@/types';

// Prakiraan Cuaca BMKG — publik, tidak butuh Authorization. Backend meng-cache 30 menit &
// membatasi 60 permintaan/menit/IP, jadi cukup panggil sekali per buka layar / refresh.
// Lihat "Prakiraan Cuaca BMKG" di documentation/API_CONTRACT.md.

export interface WeatherQuery {
  // Koordinat GPS perangkat (prioritas utama bila tersedia).
  lat?: number;
  lon?: number;
  // Kode wilayah ADM4 Kemendagri / BMKG tingkat desa/kelurahan (contoh: 31.71.01.1001).
  adm4?: string;
}

// GET /weather — kalau adm4 & koordinat tidak dikirim, backend memakai wilayah pangkalan satuan
// akun yang login (fallback ke Mabes / Jakarta Pusat).
export async function getWeatherApi(query: WeatherQuery = {}): Promise<WeatherForecast> {
  const params: Record<string, string | number> = {};
  if (typeof query.lat === 'number' && typeof query.lon === 'number') {
    params.latitude = query.lat;
    params.longitude = query.lon;
  }
  if (query.adm4) params.adm4 = query.adm4;

  const { data } = await axiosInstance.get<ApiResponse<WeatherForecast>>('/weather', { params });
  return data.data;
}

export interface WeatherRegionQuery {
  // Kata kunci nama daerah (mis. "Gambir", "Bandung", "31.71").
  q?: string;
  // Koordinat GPS — untuk mencari wilayah terdekat (hasil menyertakan `distance_km`).
  lat?: number;
  lon?: number;
  // Batas hasil (default backend 20, maks 50).
  limit?: number;
}

// GET /weather/regions — autocomplete pencarian wilayah + kode ADM4, atau daftar wilayah terdekat
// bila dikirim koordinat.
export async function searchWeatherRegionsApi(
  query: WeatherRegionQuery = {},
): Promise<WeatherRegion[]> {
  const params: Record<string, string | number> = {};
  if (query.q) params.q = query.q;
  if (typeof query.lat === 'number' && typeof query.lon === 'number') {
    params.latitude = query.lat;
    params.longitude = query.lon;
  }
  if (typeof query.limit === 'number') params.limit = query.limit;

  const { data } = await axiosInstance.get<ApiResponse<WeatherRegion[]>>('/weather/regions', {
    params,
  });
  return data.data;
}

// GET /weather/reverse-geocode — wilayah + kode ADM4 terdekat dari koordinat GPS.
export async function reverseGeocodeWeatherApi(lat: number, lon: number): Promise<WeatherRegion> {
  const { data } = await axiosInstance.get<ApiResponse<WeatherRegion>>('/weather/reverse-geocode', {
    params: { latitude: lat, longitude: lon },
  });
  return data.data;
}
