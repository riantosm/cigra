import { useCallback, useEffect, useState } from 'react';

import { getPersonnelLocationDetailApi } from '@/services/api/location.service';
import type { PersonnelLocationDetail } from '@/types';

const POLL_INTERVAL_MS = 60_000;

export interface UsePersonnelLocationResult {
  locationDetail: PersonnelLocationDetail | null;
  isLoading: boolean;
  reload: () => Promise<void>;
}

// Ambil posisi terkini + riwayat pergerakan seorang personel dari `GET /locations/{NRP}`, lalu
// polling diam-diam tiap menit selagi hook ini terpasang (tidak menyentuh `isLoading` supaya tidak
// memunculkan spinner berulang). `serviceNumber` null/kosong (mis. persit tanpa pasangan prajurit)
// -> tidak ada request, hasilnya null. Dipakai tab Lokasi di PersonnelTabs & PersitTabs.
export function usePersonnelLocation(serviceNumber: string | null | undefined): UsePersonnelLocationResult {
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
    if (!serviceNumber) return undefined;
    const intervalId = setInterval(() => {
      reload();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [reload, serviceNumber]);

  return { locationDetail, isLoading, reload };
}
