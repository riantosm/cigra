import type { ReactNode } from 'react';

import type { BadgeVariant } from '@/components/atoms/Badge';
import type { IconName } from '@/components/atoms/Icon';
import CatalogListSection from '@/components/molecules/CatalogListSection';
import InfoRow from '@/components/molecules/InfoRow';
import SectionCard from '@/components/molecules/SectionCard';
import type { FilterField, FilterOption } from '@/components/organisms/FilterSheet';
import PersitTabs from '@/screens/CatalogDetail/PersitTabs';
import PersonnelTabs from '@/screens/CatalogDetail/PersonnelTabs';
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
import type {
  CatalogListParams,
  CatalogListResult,
} from '@/services/api/catalog.service';
import { colors } from '@/theme/colors';
import type { CatalogResourceKey } from '@/navigation/types';
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
import {
  formatDateShort,
  formatDateTime,
  joinFields,
  orDash,
  titleCase,
} from '@/utils/format';

export interface CatalogListItem {
  id: string;
  title: string;
  subtitle: string;
  // Path foto mentah dari API (lihat `CatalogDetailHeader.photo`) — belum dikirim oleh endpoint
  // *list* personnel/persit/vehicles (cuma endpoint detail-nya), jadi ini selalu kosong untuk
  // sekarang dan `ListAvatar` (CatalogList) jatuh ke fallback inisial. Field tetap disediakan biar
  // begitu API list-nya nambahin `photo`, tinggal di-map di sini tanpa ubah komponen.
  photo?: string | null;
  badgeLabel?: string;
  badgeVariant?: BadgeVariant;
}

// Alias ke tipe generik FilterSheet — dipertahankan supaya referensi `CatalogFilterField` di
// tempat lain (mis. komentar di catalog.service.ts) tetap bermakna.
export type CatalogFilterOption = FilterOption;
export type CatalogFilterField = FilterField;

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
  fetchList: (
    params: CatalogListParams,
  ) => Promise<CatalogListResult<ListSource>>;
  fetchDetail: (id: string) => Promise<Detail>;
  toListItem: (item: ListSource) => CatalogListItem;
  detailHeader: (detail: Detail) => CatalogDetailHeader;
  // `header` (arg ke-2) cuma dipakai resource dengan `tabbedDetail: true` — di situ header card-nya
  // di-render DI DALAM tab container (bukan di luar seperti resource lain) supaya bisa ikut collapse
  // pas discroll (lihat CatalogDetail/index.tsx & PersonnelTabs). `onRefresh` (arg ke-3) juga cuma
  // dipakai di situ — trigger pull-to-refresh punya PersonnelTabs sendiri buat refetch `detail`
  // (data personel) bareng data ekstra yang PersonnelTabs kelola sendiri (senjata/lokasi).
  // `initialTab` (arg ke-4) cuma dipakai resource ber-`tabbedDetail` — nama tab awal yang dibuka
  // (mis. navigasi dari daftar Lokasi Personel / Emergency langsung ke tab "location").
  renderDetail: (
    detail: Detail,
    header?: ReactNode,
    onRefresh?: () => Promise<void>,
    initialTab?: string,
  ) => ReactNode;
  // Personnel pakai top tab navigator dengan collapsing header (header card ikut scroll lalu
  // tab bar menempel di bawah nav bar) yang butuh area ber-flex tetap, bukan ikut nge-scroll
  // vertikal bareng header lewat ScrollView terpisah — resource lain masih pakai satu ScrollView
  // vertikal biasa buat header+detail.
  tabbedDetail?: boolean;
  // Resource yang konsepnya punya foto (personnel/persit/vehicles) — CatalogList menampilkan
  // avatar bundar (`ListAvatar`, pakai `SecureImage` yang sama dengan detail/profile) buat resource
  // ini, fallback ke inisial kalau `CatalogListItem.photo` kosong. Resource tanpa konsep foto
  // (kategori/distribusi senjata) tidak menampilkan avatar sama sekali di list.
  hasPhoto?: boolean;
}

function statusBadgeVariant(status: string | null | undefined): BadgeVariant {
  return status === 'active' ? 'success' : 'neutral';
}

function statusBadgeLabel(status: string | null | undefined): string {
  return status === 'active' ? 'AKTIF' : orDash(status).toUpperCase();
}

// Label untuk `PersonnelDetail.last_status_location` (mis. "inside" / "outside") di header detail.
function locationStatusLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  const map: Record<string, string> = {
    inside: 'Di dalam markas',
    outside: 'Di luar markas',
  };
  return map[status] ?? titleCase(status);
}

export const catalogResourceConfigs: Record<
  CatalogResourceKey,
  CatalogResourceConfig
> = {
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
      photo: d.photo ?? null,
      title: d.full_name,
      badgeLabel: statusBadgeLabel(d.status),
      badgeVariant: statusBadgeVariant(d.status),
      metaRows: [
        { icon: 'id-card' as const, text: d.service_number },
        { icon: 'phone' as const, text: orDash(d.phone) },
        ...(locationStatusLabel(d.last_status_location)
          ? [{ icon: 'map-pin' as const, text: locationStatusLabel(d.last_status_location) as string }]
          : []),
      ],
    }),
    renderDetail: (
      d: PersonnelDetail,
      header?: ReactNode,
      onRefresh?: () => Promise<void>,
      initialTab?: string,
    ) => <PersonnelTabs detail={d} header={header} onRefresh={onRefresh} initialTabName={initialTab} />,
    tabbedDetail: true,
    hasPhoto: true,
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
      subtitle: joinFields(titleCase(p.family_relation), p.spouse?.full_name),
      badgeLabel: statusBadgeLabel(p.status),
      badgeVariant: statusBadgeVariant(p.status),
    }),
    detailHeader: (d: PersitDetail) => ({
      photo: d.photo ?? null,
      title: d.full_name,
      badgeLabel: statusBadgeLabel(d.status),
      badgeVariant: statusBadgeVariant(d.status),
      metaRows: [
        { icon: 'id-card' as const, text: d.membership_number },
        { icon: 'phone' as const, text: orDash(d.phone) },
        ...(locationStatusLabel(d.last_status_location)
          ? [{ icon: 'map-pin' as const, text: locationStatusLabel(d.last_status_location) as string }]
          : []),
      ],
    }),
    renderDetail: (
      d: PersitDetail,
      header?: ReactNode,
      onRefresh?: () => Promise<void>,
      initialTab?: string,
    ) => <PersitTabs detail={d} header={header} onRefresh={onRefresh} initialTabName={initialTab} />,
    tabbedDetail: true,
    hasPhoto: true,
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
      subtitle: joinFields(v.plate_number, titleCase(v.category)),
      badgeLabel: orDash(titleCase(v.condition_status)),
      badgeVariant: v.is_active ? 'success' : 'neutral',
    }),
    detailHeader: (d: VehicleDetail) => ({
      photo: d.photo ?? null,
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
          <InfoRow
            icon="shield-check"
            label="Kepemilikan"
            value={orDash(titleCase(d.ownership_type))}
          />
          <InfoRow
            icon="car"
            label="Kondisi"
            value={orDash(titleCase(d.condition_status))}
          />
          <InfoRow
            icon="id-card"
            label="Nomor Mesin"
            value={orDash(d.engine_number)}
          />
          <InfoRow
            icon="id-card"
            label="Nomor Rangka"
            value={orDash(d.chassis_number)}
          />
          <InfoRow
            icon="calendar"
            label="Masa Berlaku STNK"
            value={formatDateShort(d.stnk_valid_until)}
          />
          <InfoRow icon="handbook" label="Catatan" value={orDash(d.notes)} />
        </SectionCard>
        <SectionCard icon="profile" title="Pemilik">
          <InfoRow
            icon="profile"
            label="Nama"
            value={orDash(d.owner?.full_name)}
          />
          <InfoRow
            icon="id-card"
            label="Nomor Dinas"
            value={orDash(d.owner?.service_number)}
          />
        </SectionCard>
      </>
    ),
    hasPhoto: true,
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
          <InfoRow
            icon="weapon"
            label="Tipe Senjata"
            value={orDash(d.weapon_type)}
          />
          <InfoRow
            icon="shield-check"
            label="Kaliber"
            value={orDash(d.caliber)}
          />
          <InfoRow
            icon="handbook"
            label="Deskripsi"
            value={orDash(d.description)}
          />
        </SectionCard>
        <CatalogListSection
          icon="weapon"
          title="Daftar Senjata"
          items={d.weapons.map(w => ({
            title: w.weapon_number,
            subtitle: joinFields(
              w.serial_number,
              titleCase(w.condition_status),
              titleCase(w.inventory_status),
            ),
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
      subtitle: joinFields(titleCase(a.category), a.assigned_to?.full_name),
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
          <InfoRow
            icon="weapon"
            label="Kategori"
            value={orDash(titleCase(d.weapon.category))}
          />
          <InfoRow
            icon="shield-check"
            label="Kaliber"
            value={orDash(d.weapon.caliber)}
          />
          <InfoRow
            icon="car"
            label="Kondisi"
            value={orDash(titleCase(d.weapon.condition_status))}
          />
          <InfoRow
            icon="building"
            label="Status Inventaris"
            value={orDash(titleCase(d.weapon.inventory_status))}
          />
        </SectionCard>
        <SectionCard icon="calendar" title="Detail Penugasan">
          <InfoRow
            icon="calendar"
            label="Ditugaskan"
            value={formatDateTime(d.assigned_at) ?? '-'}
          />
          <InfoRow
            icon="calendar"
            label="Dikembalikan"
            value={d.returned_at ? formatDateTime(d.returned_at) ?? '-' : '-'}
          />
          <InfoRow icon="handbook" label="Catatan" value={orDash(d.notes)} />
        </SectionCard>
        <SectionCard icon="profile" title="Ditugaskan Kepada">
          <InfoRow
            icon="profile"
            label="Nama"
            value={orDash(d.assigned_to?.full_name)}
          />
          <InfoRow
            icon="id-card"
            label="Nomor Dinas"
            value={orDash(d.assigned_to?.service_number)}
          />
        </SectionCard>
      </>
    ),
  },
};
