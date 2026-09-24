import CoopMyBillsList from '@/components/organisms/CoopMyBillsList';
import MainLayout from '@/components/templates/MainLayout';
import { useCoopMyBills } from '@/hooks/useCoopMyBills';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.coopBills>;

// "Tagihan Saya" — daftar tagihan koperasi milik pengguna per periode (`GET /coop-salary-report/me`).
// Dibuka dari "Lihat Semua" di kartu Tagihan Saya (Home).
export default function CoopBillsScreen(props: Props) {
  const { navigation } = props;
  const bills = useCoopMyBills();
  const nrp = bills.data?.identity?.service_number;

  return (
    <MainLayout
      title="Tagihan Saya"
      subtitle={joinFields('Koperasi', nrp ? `NRP ${nrp}` : undefined)}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <CoopMyBillsList
        data={bills.data}
        isLoading={bills.isLoading}
        isRefreshing={bills.isRefreshing}
        isLoadingMore={bills.isLoadingMore}
        errorMessage={bills.errorMessage}
        onRefresh={bills.refresh}
        onEndReached={bills.loadMore}
        onOpenRow={rowId => navigation.navigate(ROUTES.coopBillDetail, { rowId })}
      />
    </MainLayout>
  );
}
