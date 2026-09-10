import { useCallback, useEffect, useRef, useState } from 'react';

import { getWeatherApi, reverseGeocodeWeatherApi } from '@/services/api/weather.service';
import type { WeatherForecast, WeatherRegion } from '@/types';
import { getCurrentCoordinates } from '@/utils/location';
import { extractErrorMessage, joinFields } from '@/utils/format';

export interface WeatherManualRegion {
  adm4: string;
  label: string;
}

export interface UseWeatherResult {
  weather: WeatherForecast | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  // Wilayah terdekat hasil reverse-geocode dari GPS (null saat pakai lokasi manual / gagal).
  nearest: WeatherRegion | null;
  // Lokasi manual yang dipilih pengguna untuk sesi ini (null = ikut GPS). Tidak dipersist —
  // setiap kali app dibuka default-nya kembali ke lokasi perangkat.
  manualRegion: WeatherManualRegion | null;
  reload: (mode?: 'initial' | 'refresh') => Promise<void>;
  setManualRegion: (region: WeatherManualRegion | null) => Promise<void>;
}

export function regionLabel(region: WeatherRegion): string {
  return (
    joinFields(region.desa, region.kecamatan, region.kotkab) ||
    joinFields(region.kotkab, region.provinsi) ||
    region.adm4
  );
}

// Ambil prakiraan cuaca BMKG untuk Home:
// 1. default → koordinat GPS di-reverse-geocode dulu ke ADM4 terdekat
//    (GET /weather/reverse-geocode) supaya nama wilayahnya presisi, lalu GET /weather?adm4=.
// 2. kalau reverse-geocode gagal → GET /weather?lat=&lon=. Kalau GPS gagal → GET /weather
//    (backend jatuh ke wilayah satuan pangkalan).
// 3. kalau pengguna memilih lokasi manual (sesi ini) → pakai kode ADM4-nya (GET /weather?adm4=).
export function useWeather(): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearest, setNearest] = useState<WeatherRegion | null>(null);
  const [manualRegion, setManualRegionState] = useState<WeatherManualRegion | null>(null);

  const mountedRef = useRef(true);
  const manualRegionRef = useRef<WeatherManualRegion | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchForActiveLocation = useCallback(async () => {
    const manual = manualRegionRef.current;
    if (manual) {
      setNearest(null);
      return getWeatherApi({ adm4: manual.adm4 });
    }

    let coords: { latitude: number; longitude: number } | null = null;
    try {
      coords = await getCurrentCoordinates({ timeout: 8000, allowFallbackToLowAccuracy: true });
    } catch {
      coords = null;
    }
    if (!coords) {
      setNearest(null);
      return getWeatherApi({});
    }

    try {
      const region = await reverseGeocodeWeatherApi(coords.latitude, coords.longitude);
      if (mountedRef.current) setNearest(region);
      return await getWeatherApi({ adm4: region.adm4 });
    } catch {
      if (mountedRef.current) setNearest(null);
      return getWeatherApi({ lat: coords.latitude, lon: coords.longitude });
    }
  }, []);

  const reload = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const data = await fetchForActiveLocation();
        if (mountedRef.current) setWeather(data);
      } catch (err) {
        if (mountedRef.current) setError(extractErrorMessage(err, 'Gagal memuat prakiraan cuaca.'));
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [fetchForActiveLocation],
  );

  const setManualRegion = useCallback(
    async (region: WeatherManualRegion | null) => {
      manualRegionRef.current = region;
      setManualRegionState(region);
      await reload('refresh');
    },
    [reload],
  );

  useEffect(() => {
    reload('initial');
  }, [reload]);

  return {
    weather,
    isLoading,
    isRefreshing,
    error,
    nearest,
    manualRegion,
    reload,
    setManualRegion,
  };
}
