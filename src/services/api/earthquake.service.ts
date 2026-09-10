import { axiosInstance } from '@/services/api/axiosInstance';
import type { ApiResponse, EarthquakeItem, EarthquakeLatest } from '@/types';

// Gempa Bumi BMKG (InaTEWS) — publik, tidak butuh Authorization. Diperbarui BMKG otomatis
// tiap ada peristiwa gempa; throttle 60 permintaan/menit/IP.

// GET /earthquake/latest — gempa terkini (autogempa real-time).
export async function getLatestEarthquakeApi(): Promise<EarthquakeLatest> {
  const { data } = await axiosInstance.get<ApiResponse<EarthquakeLatest>>('/earthquake/latest');
  return data.data;
}

// GET /earthquake/recent — 15 gempa M 5.0+ terkini.
export async function getRecentEarthquakesApi(limit?: number): Promise<EarthquakeItem[]> {
  const { data } = await axiosInstance.get<ApiResponse<EarthquakeItem[]>>('/earthquake/recent', {
    params: limit ? { limit } : undefined,
  });
  return data.data;
}

// GET /earthquake/felt — daftar gempa yang dirasakan masyarakat.
export async function getFeltEarthquakesApi(limit?: number): Promise<EarthquakeItem[]> {
  const { data } = await axiosInstance.get<ApiResponse<EarthquakeItem[]>>('/earthquake/felt', {
    params: limit ? { limit } : undefined,
  });
  return data.data;
}
