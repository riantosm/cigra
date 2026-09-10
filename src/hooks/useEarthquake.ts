import { useCallback, useEffect, useRef, useState } from 'react';

import { getLatestEarthquakeApi } from '@/services/api/earthquake.service';
import type { EarthquakeLatest } from '@/types';
import { extractErrorMessage } from '@/utils/format';

export interface UseEarthquakeResult {
  latest: EarthquakeLatest | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  reload: (mode?: 'initial' | 'refresh') => Promise<void>;
}

// Gempa terkini BMKG (GET /earthquake/latest) untuk widget Home. Best-effort — kegagalan tidak
// memblokir Home. Daftar M 5.0+ & gempa dirasakan dimuat langsung di layar detailnya.
export function useEarthquake(): UseEarthquakeResult {
  const [latest, setLatest] = useState<EarthquakeLatest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reload = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const data = await getLatestEarthquakeApi();
      if (mountedRef.current) setLatest(data);
    } catch (err) {
      if (mountedRef.current) setError(extractErrorMessage(err, 'Gagal memuat data gempa bumi.'));
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    reload('initial');
  }, [reload]);

  return { latest, isLoading, isRefreshing, error, reload };
}
