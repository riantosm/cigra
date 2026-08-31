import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { ROUTES } from '@/navigation/paths';
import type { HealthRecordDetail } from '@/types';

export type CatalogResourceKey =
  | 'personnel'
  | 'persit'
  | 'vehicles'
  | 'weapon-categories'
  | 'weapon-assignments';

export type RootStackParamList = {
  [ROUTES.login]: undefined;
  [ROUTES.forgotPassword]: undefined;
  [ROUTES.changePassword]: undefined;
  [ROUTES.main]: undefined;
  [ROUTES.catalogList]: { resource: CatalogResourceKey };
  [ROUTES.catalogDetail]: { resource: CatalogResourceKey; id: string; initialTab?: string };
  [ROUTES.profile]: undefined;
  [ROUTES.settings]: undefined;
  [ROUTES.comingSoon]: { title: string };
  [ROUTES.personnelMap]: undefined;
  [ROUTES.personnelTracking]: undefined;
  [ROUTES.notifications]: undefined;
  [ROUTES.emergencyList]: undefined;
  [ROUTES.sendAnnouncement]: undefined;
  [ROUTES.alarmSatuan]: undefined;
  [ROUTES.healthDashboard]: undefined;
  // `mode: 'input'` → pilih anggota lalu langsung ke form input pemeriksaan (bukan ke profil).
  [ROUTES.healthPersonnelSearch]: { mode?: 'input' } | undefined;
  [ROUTES.healthPersonnelProfile]: { nrp: string };
  // `recordId` diisi → mode ubah pemeriksaan; kosong → catat pemeriksaan baru.
  [ROUTES.healthRecordInput]: { nrp: string; personnelName?: string; recordId?: number };
  // `record` diisi kalau pemanggil sudah punya datanya (mis. dari GET /health/my untuk anggota —
  // backend menolak GET /health/records/{id} untuk non-petugas). `readOnly` menyembunyikan tombol
  // ubah + pull-to-refresh (anggota tidak boleh mengedit / tidak bisa re-fetch endpoint itu).
  [ROUTES.healthRecordDetail]: { recordId: number; record?: HealthRecordDetail; readOnly?: boolean };
  [ROUTES.healthMyHistory]: undefined;
};

export type MainTabParamList = {
  [ROUTES.home]: undefined;
  [ROUTES.riwayat]: undefined;
  [ROUTES.emergency]: undefined;
  [ROUTES.bukuSaku]: undefined;
  [ROUTES.lainnya]: undefined;
};

export type RootStackScreenProps<RouteName extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, RouteName>;

export type MainTabScreenProps<RouteName extends keyof MainTabParamList> = BottomTabScreenProps<
  MainTabParamList,
  RouteName
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
