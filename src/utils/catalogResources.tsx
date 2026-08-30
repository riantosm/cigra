import type { ReactNode } from 'react';

import type { BadgeVariant } from '@/components/atoms/Badge';
import type { IconName } from '@/components/atoms/Icon';
import CatalogListSection from '@/components/molecules/CatalogListSection';
import InfoRow from '@/components/molecules/InfoRow';
import SectionCard from '@/components/molecules/SectionCard';
import {
  getPersitDetailApi,
  getPersitListApi,
  getPersonnelDetailApi,
  getPersonnelListApi,
  getVehicleDetailApi,
  getVehiclesListApi,
  getWeaponAssignmentDetailApi,
  getWeaponAssignmentsListApi,
  getWeaponCategoryDetailApi,
  getWeaponCategoriesListApi,
} from '@/services/api/catalog.service';
import type { CatalogListParams, CatalogListResult } from '@/services/api/catalog.service';
import { colors } from '@/theme/colors';
import type {
  CatalogResourceKey,
} from '@/navigation/types';
import type {
  PersitDetail,
  PersitListItem,
  PersonnelDetail,
  PersonnelListItem,
  VehicleDetail,
  VehicleListItem,
  WeaponAssignmentDetail,
  WeaponAssignmentListItem,
  WeaponCategoryDetail,
  WeaponCategoryListItem,
} from '@/types';
import { formatBirth, formatDateShort, formatDateTime, genderLabel, joinFields, orDash, titleCase } from '@/utils/format';

export interface CatalogListItem {
  id: string;
  title: string;
  subtitle: string;
  badgeLabel?: string;
  badgeVariant?: BadgeVariant;
}

export interface CatalogFilterOption {
  label: string;
  value: string;
}

export interface CatalogFilterField {
  key: string;
  label: string;
  options: CatalogFilterOption[];
}

export interface CatalogDetailHeader {
  photo?: string | null;
  title: string;
  badgeLabel: string;
  badgeVariant: BadgeVariant;
  metaRows: { icon: IconName; text: string }[];
}

// `any` di sini disengaja: tiap entry di registry di bawah punya tipe List/Detail konkret
// sendiri-sendiri (lihat masing-masing definisi), cuma peta gabungannya yang heterogen — TS tidak
// punya existential type untuk "Record dengan tipe berbeda per key tapi tetap type-safe per akses".
export interface CatalogResourceConfig<ListSource = any, Detail = any> {
  menuTitle: string;
  menuSubtitle: string;
  icon: IconName;
  gradientStart: string;
  gradientEnd: string;
  screenTitle: string;
  searchPlaceholder: string;
  // Cuma diisi buat resource yang query filter-nya sudah dikonfirmasi jalan di API (lihat
  // dokumentasi `Query filter` masing-masing endpoint) — resource tanpa ini tidak menampilkan
  // ikon filter sama sekali di CatalogList.
  filterFields?: CatalogFilterField[];
  fetchList: (params: CatalogListParams) => Promise<CatalogListResult<ListSource>>;
  fetchDetail: (id: string) => Promise<Detail>;
  toListItem: (item: ListSource) => CatalogListItem;
  detailHeader: (detail: Detail) => CatalogDetailHeader;
  renderDetail: (detail: Detail) => ReactNode;
}

function statusBadgeVariant(status: string | null | undefined): BadgeVariant {
  return status === 'active' ? 'success' : 'neutral';
}

function statusBadgeLabel(status: string | null | undefined): string {
  return status === 'active' ? 'AKTIF' : orDash(status).toUpperCase();
}

export const catalogResourceConfigs: Record<CatalogResourceKey, CatalogResourceConfig> = {
  personnel: {
    menuTitle: 'Personel',
    menuSubtitle: 'Data personel satuan',
    icon: 'profile',
    gradientStart: colors.gradientPersonnelStart,
    gradientEnd: colors.gradientPersonnelEnd,
    screenTitle: 'Personel',
    searchPlaceholder: 'Cari nama atau NRP...',
    filterFields: [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Aktif', value: 'active' },
          { label: 'Nonaktif', value: 'inactive' },
        ],
      },
      {
        key: 'gender',
        label: 'Jenis Kelamin',
        options: [
          { label: 'Laki-laki', value: 'male' },
          { label: 'Perempuan', value: 'female' },
        ],
      },
      {
        key: 'blood_type',
        label: 'Golongan Darah',
        options: [
          { label: 'A', value: 'A' },
          { label: 'B', value: 'B' },
          { label: 'AB', value: 'AB' },
          { label: 'O', value: 'O' },
        ],
      },
    ],
    fetchList: getPersonnelListApi,
    fetchDetail: getPersonnelDetailApi,
    toListItem: (p: PersonnelListItem) => ({
      id: p.service_number,
      title: p.full_name,
      subtitle: joinFields(p.rank, p.unit),
      badgeLabel: statusBadgeLabel(p.status),
      badgeVariant: statusBadgeVariant(p.status),
    }),
    detailHeader: (d: PersonnelDetail) => ({
      photo: d.photo,
      title: d.full_name,
      badgeLabel: statusBadgeLabel(d.status),
      badgeVariant: statusBadgeVariant(d.status),
      metaRows: [
        { icon: 'id-card', text: d.service_number },
        { icon: 'phone', text: orDash(d.phone) },
      ],
    }),
    renderDetail: (d: PersonnelDetail) => (
      <>
        <SectionCard icon="profile" title="Data Personel">
          <InfoRow icon="rank" label="Pangkat" value={orDash(d.rank)} />
          <InfoRow icon="profile" label="Jenis Kelamin" value={genderLabel(d.gender)} />
          <InfoRow icon="cake" label="Tempat, Tanggal Lahir" value={formatBirth(d.birth_place, d.birth_date_formatted)} />
          <InfoRow icon="blood-drop" label="Golongan Darah" value={orDash(d.blood_type)} />
          <InfoRow icon="map-pin" label="Alamat" value={orDash(d.address)} />
        </SectionCard>
        <SectionCard icon="briefcase" title="Penugasan Saat Ini">
          <InfoRow icon="briefcase" label="Jabatan" value={orDash(d.current_assignment?.position)} />
          <InfoRow icon="building" label="Satuan" value={orDash(d.current_assignment?.unit)} />
          <InfoRow icon="calendar" label="Sejak" value={formatDateShort(d.current_assignment?.start_date)} />
        </SectionCard>
        <CatalogListSection
          icon="history"
          title="Riwayat Penugasan"
          items={d.assignment_history.map(h => ({
            title: orDash(h.unit),
            subtitle: `${orDash(h.position)} · ${formatDateShort(h.start_date)} – ${h.end_date ? formatDateShort(h.end_date) : 'sekarang'}`,
          }))}
        />
        <CatalogListSection
          icon="users"
          title="Anggota Keluarga"
          items={d.family_members.map(f => ({
            title: f.full_name,
            subtitle: `${orDash(titleCase(f.family_relation))} · ${f.membership_number}`,
          }))}
        />
        <SectionCard icon="heartbeat" title="Ringkasan Kesehatan">
          <InfoRow icon="heartbeat" label="Total Pemeriksaan" value={String(d.health_summary.total_records)} />
          <InfoRow icon="calendar" label="Terakhir Diperiksa" value={formatDateTime(d.health_summary.last_examined_at) ?? '-'} />
          <InfoRow icon="shield-check" label="Hasil Terakhir" value={orDash(d.health_summary.last_result)} />
        </SectionCard>
      </>
    ),
  },

  persit: {
    menuTitle: 'Keluarga (Persit)',
    menuSubtitle: 'Data anggota keluarga',
    icon: 'users',
    gradientStart: colors.gradientFamilyStart,
    gradientEnd: colors.gradientFamilyEnd,
    screenTitle: 'Keluarga (Persit)',
    searchPlaceholder: 'Cari nama atau no. keanggotaan...',
    fetchList: getPersitListApi,
    fetchDetail: getPersitDetailApi,
    toListItem: (p: PersitListItem) => ({
      id: String(p.id),
      title: p.full_name,
      subtitle: `${orDash(titleCase(p.family_relation))} · ${orDash(p.spouse?.full_name)}`,
      badgeLabel: statusBadgeLabel(p.status),
      badgeVariant: statusBadgeVariant(p.status),
    }),
    detailHeader: (d: PersitDetail) => ({
      photo: d.photo,
      title: d.full_name,
      badgeLabel: statusBadgeLabel(d.status),
      badgeVariant: statusBadgeVariant(d.status),
      metaRows: [
        { icon: 'id-card', text: d.membership_number },
        { icon: 'phone', text: orDash(d.phone) },
      ],
    }),
    renderDetail: (d: PersitDetail) => (
      <>
        <SectionCard icon="profile" title="Data Pribadi">
          <InfoRow icon="users" label="Hubungan Keluarga" value={orDash(titleCase(d.family_relation))} />
          <InfoRow icon="cake" label="Tempat, Tanggal Lahir" value={formatBirth(d.birth_place, d.birth_date_formatted)} />
          <InfoRow icon="blood-drop" label="Golongan Darah" value={orDash(d.blood_type)} />
          <InfoRow icon="map-pin" label="Alamat" value={orDash(d.address)} />
          <InfoRow icon="briefcase" label="Pekerjaan" value={orDash(d.occupation)} />
        </SectionCard>
        <SectionCard icon="shield-check" title="Data Suami/Istri">
          <InfoRow icon="profile" label="Nama" value={orDash(d.spouse?.full_name)} />
          <InfoRow icon="id-card" label="Nomor Dinas" value={orDash(d.spouse?.service_number)} />
          <InfoRow icon="rank" label="Pangkat" value={orDash(d.spouse?.rank)} />
        </SectionCard>
      </>
    ),
  },

  vehicles: {
    menuTitle: 'Kendaraan',
    menuSubtitle: 'Data kendaraan satuan',
    icon: 'car',
    gradientStart: colors.gradientHealthStart,
    gradientEnd: colors.gradientHealthEnd,
    screenTitle: 'Kendaraan',
    searchPlaceholder: 'Cari model, plat, atau nomor mesin/rangka...',
    fetchList: getVehiclesListApi,
    fetchDetail: getVehicleDetailApi,
    toListItem: (v: VehicleListItem) => ({
      id: String(v.id),
      title: v.brand_model,
      subtitle: `${v.plate_number} · ${orDash(titleCase(v.category))}`,
      badgeLabel: orDash(titleCase(v.condition_status)),
      badgeVariant: v.is_active ? 'success' : 'neutral',
    }),
    detailHeader: (d: VehicleDetail) => ({
      photo: d.photo,
      title: d.brand_model,
      badgeLabel: d.is_active ? 'AKTIF' : 'NONAKTIF',
      badgeVariant: d.is_active ? 'success' : 'neutral',
      metaRows: [
        { icon: 'id-card', text: d.plate_number },
        { icon: 'shield-check', text: orDash(titleCase(d.category)) },
      ],
    }),
    renderDetail: (d: VehicleDetail) => (
      <>
        <SectionCard icon="car" title="Detail Kendaraan">
          <InfoRow icon="shield-check" label="Kepemilikan" value={orDash(titleCase(d.ownership_type))} />
          <InfoRow icon="car" label="Kondisi" value={orDash(titleCase(d.condition_status))} />
          <InfoRow icon="id-card" label="Nomor Mesin" value={orDash(d.engine_number)} />
          <InfoRow icon="id-card" label="Nomor Rangka" value={orDash(d.chassis_number)} />
          <InfoRow icon="calendar" label="Masa Berlaku STNK" value={formatDateShort(d.stnk_valid_until)} />
          <InfoRow icon="handbook" label="Catatan" value={orDash(d.notes)} />
        </SectionCard>
        <SectionCard icon="profile" title="Pemilik">
          <InfoRow icon="profile" label="Nama" value={orDash(d.owner?.full_name)} />
          <InfoRow icon="id-card" label="Nomor Dinas" value={orDash(d.owner?.service_number)} />
        </SectionCard>
      </>
    ),
  },

  'weapon-categories': {
    menuTitle: 'Kategori Senjata',
    menuSubtitle: 'Katalog kategori senjata',
    icon: 'weapon',
    gradientStart: colors.gradientWeaponStart,
    gradientEnd: colors.gradientWeaponEnd,
    screenTitle: 'Kategori Senjata',
    searchPlaceholder: 'Cari nama atau kode kategori...',
    fetchList: getWeaponCategoriesListApi,
    fetchDetail: getWeaponCategoryDetailApi,
    toListItem: (c: WeaponCategoryListItem) => ({
      id: String(c.id),
      title: c.name,
      subtitle: `${c.code} · ${c.weapon_type}`,
      badgeLabel: `${c.total_weapons} unit`,
      badgeVariant: c.is_active ? 'primary' : 'neutral',
    }),
    detailHeader: (d: WeaponCategoryDetail) => ({
      title: d.name,
      badgeLabel: d.is_active ? 'AKTIF' : 'NONAKTIF',
      badgeVariant: d.is_active ? 'success' : 'neutral',
      metaRows: [
        { icon: 'id-card', text: d.code },
        { icon: 'shield-check', text: `${d.total_weapons} unit` },
      ],
    }),
    renderDetail: (d: WeaponCategoryDetail) => (
      <>
        <SectionCard icon="weapon" title="Detail Kategori">
          <InfoRow icon="weapon" label="Tipe Senjata" value={orDash(d.weapon_type)} />
          <InfoRow icon="shield-check" label="Kaliber" value={orDash(d.caliber)} />
          <InfoRow icon="handbook" label="Deskripsi" value={orDash(d.description)} />
        </SectionCard>
        <CatalogListSection
          icon="weapon"
          title="Daftar Senjata"
          items={d.weapons.map(w => ({
            title: w.weapon_number,
            subtitle: `${w.serial_number} · ${orDash(titleCase(w.condition_status))} · ${orDash(titleCase(w.inventory_status))}`,
          }))}
        />
      </>
    ),
  },

  'weapon-assignments': {
    menuTitle: 'Distribusi Senjata',
    menuSubtitle: 'Penugasan senjata ke personel',
    icon: 'weapon',
    gradientStart: colors.gradientEntryStart,
    gradientEnd: colors.gradientEntryEnd,
    screenTitle: 'Distribusi Senjata',
    searchPlaceholder: 'Cari nomor atau seri senjata...',
    fetchList: getWeaponAssignmentsListApi,
    fetchDetail: getWeaponAssignmentDetailApi,
    toListItem: (a: WeaponAssignmentListItem) => ({
      id: String(a.id),
      title: a.weapon_number,
      subtitle: `${orDash(titleCase(a.category))} · ${orDash(a.assigned_to?.full_name)}`,
      badgeLabel: statusBadgeLabel(a.status),
      badgeVariant: statusBadgeVariant(a.status),
    }),
    detailHeader: (d: WeaponAssignmentDetail) => ({
      title: d.weapon.weapon_number,
      badgeLabel: statusBadgeLabel(d.status),
      badgeVariant: statusBadgeVariant(d.status),
      metaRows: [
        { icon: 'id-card', text: d.weapon.serial_number },
        { icon: 'shield-check', text: orDash(d.assignment_type) },
      ],
    }),
    renderDetail: (d: WeaponAssignmentDetail) => (
      <>
        <SectionCard icon="weapon" title="Detail Senjata">
          <InfoRow icon="weapon" label="Kategori" value={orDash(titleCase(d.weapon.category))} />
          <InfoRow icon="shield-check" label="Kaliber" value={orDash(d.weapon.caliber)} />
          <InfoRow icon="car" label="Kondisi" value={orDash(titleCase(d.weapon.condition_status))} />
          <InfoRow icon="building" label="Status Inventaris" value={orDash(titleCase(d.weapon.inventory_status))} />
        </SectionCard>
        <SectionCard icon="calendar" title="Detail Penugasan">
          <InfoRow icon="calendar" label="Ditugaskan" value={formatDateTime(d.assigned_at) ?? '-'} />
          <InfoRow icon="calendar" label="Dikembalikan" value={d.returned_at ? (formatDateTime(d.returned_at) ?? '-') : '-'} />
          <InfoRow icon="handbook" label="Catatan" value={orDash(d.notes)} />
        </SectionCard>
        <SectionCard icon="profile" title="Ditugaskan Kepada">
          <InfoRow icon="profile" label="Nama" value={orDash(d.assigned_to?.full_name)} />
          <InfoRow icon="id-card" label="Nomor Dinas" value={orDash(d.assigned_to?.service_number)} />
        </SectionCard>
      </>
    ),
  },
};
