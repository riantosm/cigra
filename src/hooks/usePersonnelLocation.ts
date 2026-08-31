import { useCallback, useEffect, useState } from 'react';

import { getPersonnelLocationDetailApi } from '@/services/api/location.service';
import type { PersonnelLocationDetail } from '@/types';

const POLL_INTERVAL_MS = 60_000;

export interface UsePersonnelLocationResult {
  locationDetail: PersonnelLocationDetail | null;
  isLoading: boolean;
  reload: () => Promise<void>;
}

export interface UsePersonnelLocationOptions {
  // Polling tiap menit hanya jalan kalau ini true — dipakai supaya detail Personel/Persit tidak
  // memicu re-render seluruh pohon tab (yang bikin frame drop saat scroll) selagi user ada di tab
  // selain "Lokasi". Fetch awal tetap jalan sekali tanpa memandang flag ini.
  pollingEnabled?: boolean;
}

// Ambil posisi terkini + riwayat pergerakan seorang personel dari `GET /locations/{NRP}`, lalu
// polling diam-diam tiap menit selagi hook ini terpasang (tidak menyentuh `isLoading` supaya tidak
// memunculkan spinner berulang). `serviceNumber` null/kosong (mis. persit tanpa pasangan prajurit)
// -> tidak ada request, hasilnya null. Dipakai tab Lokasi di PersonnelTabs & PersitTabs.
export function usePersonnelLocation(
  serviceNumber: string | null | undefined,
  options: UsePersonnelLocationOptions = {},
): UsePersonnelLocationResult {
  const { pollingEnabled = true } = options;
  const [locationDetail, setLocationDetail] = useState<PersonnelLocationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!serviceNumber) {
      setLocationDetail(null);
      return;
    }
    try {
      setLocationDetail(await getPersonnelLocationDetailApi(serviceNumber));
    } catch {
      // Best-effort — tab Lokasi tetap menampilkan data lama kalau ini gagal.
    }
  }, [serviceNumber]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    reload().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    if (!serviceNumber || !pollingEnabled) return undefined;
    const intervalId = setInterval(() => {
      reload();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [reload, serviceNumber, pollingEnabled]);

  return { locationDetail, isLoading, reload };
}
