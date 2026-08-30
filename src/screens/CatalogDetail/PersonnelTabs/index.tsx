import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import Card from '@/components/molecules/Card';
import CatalogListSection from '@/components/molecules/CatalogListSection';
import InfoRow from '@/components/molecules/InfoRow';
import OpenMapsButton from '@/components/molecules/OpenMapsButton';
import SectionCard from '@/components/molecules/SectionCard';
import CollapsingTabsDetail from '@/components/organisms/CollapsingTabsDetail';
import type { CollapsingTabDef } from '@/components/organisms/CollapsingTabsDetail';
import LocationPanel from '@/components/organisms/LocationPanel';
import { usePersonnelLocation } from '@/hooks/usePersonnelLocation';
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

type PersonnelTabName = 'info' | 'movement' | 'location';

export interface PersonnelTabsProps {
  detail: PersonnelDetail;
  header?: ReactNode;
  onRefresh?: () => Promise<void>;
  // Tab yang dibuka pertama kali (mis. navigasi dari daftar Lokasi/Emergency langsung ke 'location').
  initialTabName?: string;
}

function toPersonnelTabName(name: string | undefined): PersonnelTabName {
  return name === 'movement' || name === 'location' ? name : 'info';
}

interface InfoTabProps {
  detail: PersonnelDetail;
  weapons: WeaponAssignmentListItem[];
  isLoadingWeapons: boolean;
}

function InfoTab(props: InfoTabProps) {
  const { detail, weapons, isLoadingWeapons } = props;

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
}

// Dummy sementara — belum ada endpoint riwayat keluar-masuk di backend (lihat draf API
// yang dikirim ke tim backend). Bentuk field di sini (exit_at/entry_at/purpose) sengaja
// disamakan dengan draf itu supaya tinggal ganti sumber data begitu API-nya jadi.
const MOVEMENT_DUMMY_ENTRIES = [
  {
    id: 1,
    exit_at: '28/09/2022 - 13.00',
    entry_at: '28/09/2022 - 17.00',
    purpose: 'Jaga Depan',
  },
  {
    id: 2,
    exit_at: '27/09/2022 - 08.00',
    entry_at: '27/09/2022 - 12.00',
    purpose: 'Latihan Lapangan',
  },
  {
    id: 3,
    exit_at: '25/09/2022 - 09.30',
    entry_at: '25/09/2022 - 11.00',
    purpose: 'Izin Keluar Markas',
  },
];

interface MovementTabProps {
  detail: PersonnelDetail;
}

function MovementTab(props: MovementTabProps) {
  const { detail } = props;

  return (
    <>
      <View style={styles.movementHeaderBar}>
        <Text style={styles.movementHeaderText}>Catatan Keluar Masuk</Text>
      </View>
      <View style={styles.movementList}>
        {MOVEMENT_DUMMY_ENTRIES.map(entry => (
          <Card key={entry.id} style={styles.movementCard}>
            <View style={styles.movementRow}>
              <View style={styles.movementIconCircle}>
                <Icon name="clock" size={13} color={colors.primary} />
              </View>
              <Text style={styles.movementLabel}>Keluar</Text>
              <Text style={styles.movementValue}>{`: ${entry.exit_at}`}</Text>
            </View>
            <View style={styles.movementRow}>
              <View style={styles.movementIconCircle}>
                <Icon name="clock" size={13} color={colors.primary} />
              </View>
              <Text style={styles.movementLabel}>Masuk</Text>
              <Text style={styles.movementValue}>{`: ${entry.entry_at}`}</Text>
            </View>
            <View style={styles.movementRow}>
              <View style={styles.movementIconCircle}>
                <Icon name="crosshair" size={13} color={colors.primary} />
              </View>
              <Text style={styles.movementLabel}>Tujuan</Text>
              <Text style={styles.movementValue}>{`: ${entry.purpose}`}</Text>
            </View>

            <View style={styles.movementDivider} />

            <View style={styles.movementPersonRow}>
              <View style={styles.movementPersonAvatar}>
                <Icon name="profile" size={16} color={colors.primary} />
              </View>
              <View style={styles.movementPersonText}>
                <Text style={styles.movementPersonName}>{detail.full_name}</Text>
                <Text style={styles.movementPersonUsername}>{`@${detail.service_number}`}</Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.textMuted} />
            </View>
          </Card>
        ))}
      </View>
    </>
  );
}

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

  const tabs: CollapsingTabDef[] = [
    {
      name: 'info',
      icon: 'profile',
      label: 'Informasi',
      render: () => <InfoTab detail={detail} weapons={weapons} isLoadingWeapons={isLoadingWeapons} />,
    },
    {
      name: 'movement',
      icon: 'clock',
      label: 'Riwayat Keluar Masuk',
      render: () => <MovementTab detail={detail} />,
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
          }}
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
  movementHeaderBar: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: colors.text,
  },
  movementHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  movementList: {
    gap: 12,
  },
  movementCard: {
    gap: 2,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  movementIconCircle: {
    height: 24,
    width: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  movementLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    minWidth: 52,
  },
  movementValue: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  movementDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  movementPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  movementPersonAvatar: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  movementPersonText: {
    flex: 1,
    gap: 1,
  },
  movementPersonName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  movementPersonUsername: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
