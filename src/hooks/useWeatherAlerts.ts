import { useCallback, useEffect, useRef, useState } from 'react';

import { getWeatherAlertsApi } from '@/services/api/weather.service';
import type { WeatherAlert, WeatherAlertFeed } from '@/types';
import { extractErrorMessage } from '@/utils/format';

export interface UseWeatherAlertsResult {
  feed: WeatherAlertFeed | null;
  alerts: WeatherAlert[];
  // Ada minimal satu peringatan dengan severity 'danger'.
  hasDanger: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  reload: (mode?: 'initial' | 'refresh') => Promise<void>;
}

// Peringatan Dini Cuaca Ekstrem BMKG (GET /weather/alerts). Best-effort — kegagalan tidak
// memblokir Home. Backend meng-cache 5 menit jadi aman dipanggil tiap buka Home / pull-to-refresh.
export function useWeatherAlerts(): UseWeatherAlertsResult {
  const [feed, setFeed] = useState<WeatherAlertFeed | null>(null);
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
      const data = await getWeatherAlertsApi();
      if (mountedRef.current) setFeed(data);
    } catch (err) {
      if (mountedRef.current) setError(extractErrorMessage(err, 'Gagal memuat peringatan dini cuaca.'));
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

  const alerts = feed?.items ?? [];
  return {
    feed,
    alerts,
    hasDanger: alerts.some(a => a.severity === 'danger'),
    isLoading,
    isRefreshing,
    error,
    reload,
  };
}
