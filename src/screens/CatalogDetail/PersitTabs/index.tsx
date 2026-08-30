import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import InfoRow from '@/components/molecules/InfoRow';
import OpenMapsButton from '@/components/molecules/OpenMapsButton';
import SectionCard from '@/components/molecules/SectionCard';
import CollapsingTabsDetail from '@/components/organisms/CollapsingTabsDetail';
import type { CollapsingTabDef } from '@/components/organisms/CollapsingTabsDetail';
import LocationPanel from '@/components/organisms/LocationPanel';
import { usePersonnelLocation } from '@/hooks/usePersonnelLocation';
import { colors } from '@/theme/colors';
import type { PersitDetail } from '@/types';
import { formatBirth, orDash, titleCase } from '@/utils/format';

type PersitTabName = 'info' | 'location';

export interface PersitTabsProps {
  detail: PersitDetail;
  header?: ReactNode;
  onRefresh?: () => Promise<void>;
  initialTabName?: string;
}

function toPersitTabName(name: string | undefined): PersitTabName {
  return name === 'location' ? 'location' : 'info';
}

// Detail persit: tab "Informasi" (data pribadi + pasangan) dan "Lokasi" — sama seperti detail
// Personel. Lokasi yang ditampilkan adalah lokasi pasangan prajurit-nya (`spouse.service_number`),
// karena pelacakan posisi terikat ke NRP personel, bukan ke anggota keluarga.
export default function PersitTabs(props: PersitTabsProps) {
  const { detail, header, onRefresh, initialTabName } = props;
  const initialTab = toPersitTabName(initialTabName);
  const [activeTabName, setActiveTabName] = useState<PersitTabName>(initialTab);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const spouseServiceNumber = detail.spouse?.service_number ?? null;
  const { locationDetail, isLoading: isLoadingLocation, reload: reloadLocation } = usePersonnelLocation(
    spouseServiceNumber,
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([onRefresh?.() ?? Promise.resolve(), reloadLocation()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, reloadLocation]);

  const refreshControl = (
    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
  );

  const handleTabChange = useCallback((name: string) => {
    setActiveTabName(toPersitTabName(name));
  }, []);

  const tabs: CollapsingTabDef[] = [
    {
      name: 'info',
      icon: 'profile',
      label: 'Informasi',
      render: () => (
        <>
          <SectionCard icon="profile" title="Data Pribadi">
            <InfoRow
              icon="users"
              label="Hubungan Keluarga"
              value={orDash(titleCase(detail.family_relation))}
            />
            <InfoRow
              icon="cake"
              label="Tempat, Tanggal Lahir"
              value={formatBirth(detail.birth_place, detail.birth_date_formatted)}
            />
            <InfoRow icon="blood-drop" label="Golongan Darah" value={orDash(detail.blood_type)} />
            <InfoRow icon="map-pin" label="Alamat" value={orDash(detail.address)} />
            <InfoRow icon="briefcase" label="Pekerjaan" value={orDash(detail.occupation)} />
          </SectionCard>
          <SectionCard icon="shield-check" title="Data Suami/Istri">
            <InfoRow icon="profile" label="Nama" value={orDash(detail.spouse?.full_name)} />
            <InfoRow icon="id-card" label="Nomor Dinas" value={orDash(detail.spouse?.service_number)} />
            <InfoRow icon="rank" label="Pangkat" value={orDash(detail.spouse?.rank)} />
          </SectionCard>
        </>
      ),
    },
    {
      name: 'location',
      icon: 'map-pin',
      label: 'Lokasi',
      render: () => (
        <LocationPanel
          locationDetail={locationDetail}
          isLoading={isLoadingLocation}
          person={{
            id: detail.spouse?.id ?? detail.id,
            serviceNumber: detail.spouse?.service_number ?? '',
            fullName: detail.spouse?.full_name ?? detail.full_name,
            rank: detail.spouse?.rank ?? null,
            unit: null,
            tenantId: detail.tenant_id,
          }}
          unavailableLabel={
            spouseServiceNumber ? undefined : 'Data pasangan prajurit tidak tersedia untuk pelacakan lokasi.'
          }
        />
      ),
    },
  ];

  return (
    <View style={styles.root}>
      <CollapsingTabsDetail
        header={header}
        initialTabName={initialTab}
        tabs={tabs}
        refreshControl={refreshControl}
        onTabChange={handleTabChange}
      />
      {activeTabName !== 'location' && locationDetail?.location ? (
        <OpenMapsButton
          latitude={locationDetail.location.latitude}
          longitude={locationDetail.location.longitude}
          floating
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
