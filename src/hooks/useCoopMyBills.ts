import { useCallback, useEffect, useState } from 'react';

import { getMyCoopBillsApi } from '@/services/api/coopSalary.service';
import type { CoopMyBills } from '@/types';
import { extractErrorMessage } from '@/utils/format';

const PER_PAGE = 12;

// Daftar "Tagihan Saya" (`GET /coop-salary-report/me`, berpaginasi) — dipakai layar CoopBills dan
// tab "Tagihan Saya" di CoopReports. `enabled=false` menunda muat pertama (tab belum dibuka).
export function useCoopMyBills(enabled = true) {
  const [data, setData] = useState<CoopMyBills | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (page: number, mode: 'initial' | 'refresh' | 'more') => {
    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);
    if (mode === 'more') setIsLoadingMore(true);
    setErrorMessage(null);
    try {
      const result = await getMyCoopBillsApi({ page, per_page: PER_PAGE });
      setData(previous =>
        page <= 1 || !previous
          ? result
          : {
              ...result,
              rows: [...previous.rows, ...result.rows.filter(row => !previous.rows.some(p => p.id === row.id))],
            },
      );
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat tagihan koperasi.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && !data) load(1, 'initial');
  }, [enabled, data, load]);

  const canLoadMore = !!data && data.meta.current_page < data.meta.last_page;

  return {
    data,
    isLoading,
    isRefreshing,
    isLoadingMore,
    errorMessage,
    refresh: () => load(1, 'refresh'),
    loadMore: () => {
      if (data && canLoadMore && !isLoadingMore) load(data.meta.current_page + 1, 'more');
    },
  };
}
