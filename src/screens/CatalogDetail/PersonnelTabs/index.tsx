import type { ReactNode } from 'react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import CatalogListSection from '@/components/molecules/CatalogListSection';
import InfoRow from '@/components/molecules/InfoRow';
import OpenMapsButton from '@/components/molecules/OpenMapsButton';
import SectionCard from '@/components/molecules/SectionCard';
import VisitorLogHistory from '@/components/molecules/VisitorLogHistory';
import WeaponLoanHistory from '@/components/molecules/WeaponLoanHistory';
import CollapsingTabsDetail from '@/components/organisms/CollapsingTabsDetail';
import type { CollapsingTabDef } from '@/components/organisms/CollapsingTabsDetail';
import LocationPanel from '@/components/organisms/LocationPanel';
import { usePersonnelLocation } from '@/hooks/usePersonnelLocation';
import { ROUTES } from '@/navigation/paths';
import type { RootStackParamList } from '@/navigation/types';
import { getWeaponAssignmentsListApi } from '@/services/api/catalog.service';
import { colors } from '@/theme/colors';
import type { PersonnelDetail, WeaponAssignmentListItem } from '@/types';
import {
  formatBirth,
  formatDateShort,
  formatDateTime,
  genderLabel,
  joinFields,
  orDash,
  titleCase,
} from '@/utils/format';

type PersonnelTabName = 'info' | 'visitor' | 'weapon-loan' | 'location';

export interface PersonnelTabsProps {
  detail: PersonnelDetail;
  header?: ReactNode;
  onRefresh?: () => Promise<void>;
  // Tab yang dibuka pertama kali (mis. navigasi dari daftar Lokasi/Emergency langsung ke 'location').
  initialTabName?: string;
}

function toPersonnelTabName(name: string | undefined): PersonnelTabName {
  // `movement` = nama lama tab "Riwayat Keluar Masuk" (kini "Riwayat visitor") — dipetakan supaya
  // deep-link lama (mis. shortcut "Riwayat Pergerakan" di MemberHome) tetap membuka tab yang benar.
  if (name === 'movement') return 'visitor';
  return name === 'visitor' || name === 'weapon-loan' || name === 'location' ? name : 'info';
}

interface InfoTabProps {
  detail: PersonnelDetail;
  weapons: WeaponAssignmentListItem[];
  isLoadingWeapons: boolean;
}

const InfoTab = memo(function InfoTabInner(props: InfoTabProps) {
  const { detail, weapons, isLoadingWeapons } = props;
  // CatalogDetail adalah screen root-stack biasa, jadi nav prop-nya sudah tahu semua route stack.
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <>
      <SectionCard icon="profile" title="Data Personel">
        <InfoRow icon="rank" label="Pangkat" value={orDash(detail.rank)} />
        <InfoRow icon="profile" label="Jenis Kelamin" value={genderLabel(detail.gender)} />
        <InfoRow
          icon="cake"
          label="Tempat, Tanggal Lahir"
          value={formatBirth(detail.birth_place, detail.birth_date_formatted)}
        />
        <InfoRow icon="blood-drop" label="Golongan Darah" value={orDash(detail.blood_type)} />
        <InfoRow icon="map-pin" label="Alamat" value={orDash(detail.address)} />
      </SectionCard>
      <SectionCard icon="briefcase" title="Penugasan Saat Ini">
        <InfoRow icon="briefcase" label="Jabatan" value={orDash(detail.current_assignment?.position)} />
        <InfoRow icon="building" label="Satuan" value={orDash(detail.current_assignment?.unit)} />
        <InfoRow icon="calendar" label="Sejak" value={formatDateShort(detail.current_assignment?.start_date)} />
      </SectionCard>
      <CatalogListSection
        icon="history"
        title="Riwayat Penugasan"
        items={detail.assignment_history.map(h => ({
          title: orDash(h.unit),
          subtitle: joinFields(
            h.position,
            `${formatDateShort(h.start_date)} – ${h.end_date ? formatDateShort(h.end_date) : 'Sekarang'}`,
          ),
        }))}
      />
      <CatalogListSection
        icon="users"
        title="Anggota Keluarga"
        items={detail.family_members.map(f => ({
          title: f.full_name,
          subtitle: joinFields(titleCase(f.family_relation), f.membership_number),
          onPress: () =>
            navigation.push(ROUTES.catalogDetail, { resource: 'persit', id: String(f.id) }),
        }))}
      />
      <CatalogListSection
        icon="weapon"
        title="Distribusi Senjata"
        items={weapons.map(w => ({
          title: w.weapon_number,
          subtitle: joinFields(titleCase(w.category), titleCase(w.status)),
        }))}
        emptyLabel={isLoadingWeapons ? 'Memuat...' : 'Belum ada senjata yang ditugaskan.'}
      />
      <SectionCard icon="heartbeat" title="Ringkasan Kesehatan">
        <InfoRow
          icon="heartbeat"
          label="Total Pemeriksaan"
          value={String(detail.health_summary.total_records)}
        />
        <InfoRow
          icon="calendar"
          label="Terakhir Diperiksa"
          value={formatDateTime(detail.health_summary.last_examined_at) ?? '-'}
        />
        <InfoRow
          icon="shield-check"
          label="Hasil Terakhir"
          value={orDash(detail.health_summary.last_result)}
        />
      </SectionCard>
    </>
  );
});

export default function PersonnelTabs(props: PersonnelTabsProps) {
  const { detail, header, onRefresh, initialTabName } = props;
  const initialTab = toPersonnelTabName(initialTabName);
  // Cuma buat tahu kapan harus sembunyiin tombol "Buka di Google Maps" yang mengambang (tab
  // Lokasi sudah punya tombol yang sama inline di dalam kontennya sendiri).
  const [activeTabName, setActiveTabName] = useState<PersonnelTabName>(initialTab);
  const [weapons, setWeapons] = useState<WeaponAssignmentListItem[]>([]);
  const [isLoadingWeapons, setIsLoadingWeapons] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { locationDetail, isLoading: isLoadingLocation, reload: reloadLocation } = usePersonnelLocation(
    detail.service_number,
    { pollingEnabled: activeTabName === 'location' },
  );

  const loadWeapons = useCallback(async () => {
    try {
      // Belum ada filter server-side yang jalan buat "senjata milik personel X" (sudah dicoba
      // assigned_to_id/personnel_id/service_number, semua diabaikan) — dataset-nya kecil (< 50),
      // jadi filter dikerjakan di client dari daftar lengkap.
      const weaponResult = await getWeaponAssignmentsListApi({});
      setWeapons(weaponResult.items.filter(w => w.assigned_to.service_number === detail.service_number));
    } catch {
      // Best-effort — tab Informasi tetap tampil kosong di bagian senjata kalau ini gagal.
    }
  }, [detail.service_number]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingWeapons(true);
    loadWeapons().finally(() => {
      if (!cancelled) setIsLoadingWeapons(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadWeapons]);

  // Pull-to-refresh: refetch data personel (dikelola CatalogDetailScreen, lewat `onRefresh`) plus
  // data ekstra tab ini (senjata/lokasi) bareng — satu gesture, beberapa sumber data.
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([onRefresh?.() ?? Promise.resolve(), loadWeapons(), reloadLocation()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, loadWeapons, reloadLocation]);

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />,
    [isRefreshing, handleRefresh],
  );

  const handleTabChange = useCallback((name: string) => {
    setActiveTabName(toPersonnelTabName(name));
  }, []);

  // Di-memo supaya poll lokasi 60 detik (atau re-render lain dari parent) tidak membangun ulang
  // array tab + closure `render`-nya, yang bikin library mengukur ulang & isi tab ter-render ulang.
  const tabs: CollapsingTabDef[] = useMemo(
    () => [
      {
        name: 'info',
        icon: 'profile',
        label: 'Informasi',
        render: () => <InfoTab detail={detail} weapons={weapons} isLoadingWeapons={isLoadingWeapons} />,
      },
      {
        name: 'visitor',
        icon: 'clock',
        label: 'Riwayat visitor',
        render: () => <VisitorLogHistory entries={detail.visitor_log_history ?? []} />,
      },
      {
        name: 'weapon-loan',
        icon: 'weapon',
        label: 'Peminjaman Senjata',
        render: () => <WeaponLoanHistory entries={detail.weapon_loan_history ?? []} />,
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
              id: detail.id,
              serviceNumber: detail.service_number,
              fullName: detail.full_name,
              rank: detail.rank,
              unit: detail.current_assignment?.unit ?? null,
              tenantId: detail.tenant_id,
              photo: detail.photo,
            }}
          />
        ),
      },
    ],
    [detail, weapons, isLoadingWeapons, locationDetail, isLoadingLocation],
  );

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
