import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { ROUTES } from '@/navigation/paths';
import type {
  HandbookChapter,
  HealthRecordDetail,
  PatrolMonitoringSession,
  PatrolRoute,
  RollCallEntryStatus,
} from '@/types';

/** Payload hasil satu sesi tryout TKD — cukup untuk merekonstruksi skor & pembahasan (data dummy). */
export type TkdAttemptParams = {
  moduleId: string;
  answers: Record<string, string>;
  raguIds: string[];
  elapsedSeconds: number;
};

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
  [ROUTES.appBootstrap]: undefined;
  [ROUTES.main]: undefined;
  // Academy sub-app (bottom-tab navigator sendiri) — di-push dari tab "Academy" bar utama.
  [ROUTES.academyRoot]: undefined;
  // Alur Akademik › TKD (data dummy).
  [ROUTES.academyTkdList]: undefined;
  [ROUTES.academyTkdModule]: { moduleId: string };
  [ROUTES.academyTkdExam]: { moduleId: string };
  [ROUTES.academyTkdResult]: TkdAttemptParams;
  [ROUTES.academyTkdReview]: TkdAttemptParams;
  [ROUTES.catalogList]: { resource: CatalogResourceKey };
  [ROUTES.catalogDetail]: { resource: CatalogResourceKey; id: string; initialTab?: string };
  [ROUTES.profile]: undefined;
  [ROUTES.settings]: undefined;
  [ROUTES.comingSoon]: { title: string };
  // Buka satu Bab Buku Saku sebagai E-Book; navigasi antar halaman (next/back) pakai
  // `chapter.articles`. `initialArticleId` → mulai dari halaman itu (default: halaman pertama).
  [ROUTES.bukuSakuDetail]: { chapter: HandbookChapter; initialArticleId?: number };
  [ROUTES.personnelMap]: undefined;
  [ROUTES.personnelTracking]: undefined;
  [ROUTES.notifications]: undefined;
  [ROUTES.emergencyList]: undefined;
  [ROUTES.emergencyDetail]: { id: string };
  [ROUTES.emergencyContacts]: undefined;
  [ROUTES.announcements]: undefined;
  [ROUTES.myMovements]: undefined;
  // Detail anggota keluarga (Persit) versi anggota — `id` = `MeFamilyMember.id`.
  [ROUTES.meFamilyDetail]: { id: number; name?: string };
  [ROUTES.activityMovements]: undefined;
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
  // --- Kekuatan Apel ---
  [ROUTES.rollCallList]: undefined;
  [ROUTES.rollCallCreate]: undefined;
  [ROUTES.rollCallDetail]: { id: number };
  // `status` menentukan alur setelah pilih personel: 'present' → langsung dicatat hadir,
  // 'absent' → menuju form keterangan.
  [ROUTES.rollCallSearch]: { sessionId: number; status: RollCallEntryStatus };
  [ROUTES.rollCallScan]: { sessionId: number; status: RollCallEntryStatus };
  [ROUTES.rollCallEntry]: {
    sessionId: number;
    personnelId: number;
    personnelName: string;
    serviceNumber?: string;
    status: RollCallEntryStatus;
  };
  // --- Patroli ---
  [ROUTES.patrol]: undefined;
  // Rute lengkap di-pass supaya daftar checkpoint tampil tanpa fetch ulang; layar ini juga
  // yang memulai sesi (catatan awal + tombol "Mulai Patroli Rute Ini" → POST start).
  [ROUTES.patrolRouteDetail]: { route: PatrolRoute; activePatrolSessionId?: number };
  [ROUTES.patrolActive]: undefined;
  // Scan QR checkpoint (kamera). `nextCheckpoint` = checkpoint berikutnya yang harus dipindai.
  [ROUTES.patrolScan]: {
    sessionId: number;
    routeName?: string;
    totalCheckpoints: number;
    nextCheckpoint: { name: string; qrCode: string; sequenceOrder: number };
  };
  // Ambil foto bukti (selfie) setelah scan checkpoint.
  [ROUTES.patrolPhoto]: {
    sessionId: number;
    checkpointName: string;
    checkpointCode: string;
    sequenceOrder: number;
    totalCheckpoints: number;
  };
  // Monitoring patroli (POV komandan — hanya memantau, tidak ikut patroli).
  [ROUTES.patrolMonitoring]: undefined;
  [ROUTES.patrolMonitoringDetail]: { session: PatrolMonitoringSession };
};

export type MainTabParamList = {
  [ROUTES.home]: undefined;
  [ROUTES.riwayat]: undefined;
  [ROUTES.emergency]: undefined;
  [ROUTES.bukuSaku]: undefined;
  [ROUTES.academy]: undefined;
};

export type AcademyTabParamList = {
  [ROUTES.academyBeranda]: undefined;
  [ROUTES.academyAkademik]: undefined;
  [ROUTES.academyPsikologi]: undefined;
  [ROUTES.academyJasmani]: undefined;
  [ROUTES.academyRiwayat]: undefined;
};

export type RootStackScreenProps<RouteName extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, RouteName>;

export type MainTabScreenProps<RouteName extends keyof MainTabParamList> = BottomTabScreenProps<
  MainTabParamList,
  RouteName
>;

export type AcademyTabScreenProps<RouteName extends keyof AcademyTabParamList> = BottomTabScreenProps<
  AcademyTabParamList,
  RouteName
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
