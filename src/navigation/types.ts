import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { ROUTES } from '@/navigation/paths';
import type {
  AcademyVerificationItem,
  AcademyProgramPov,
  HandbookChapter,
  HealthRecordDetail,
  PatrolMonitoringSession,
  PatrolRoute,
  PersonnelSearchItem,
  RollCallEntryStatus,
} from '@/types';

/** Surat masuk terpilih yang di-pass ke layar Buat Disposisi (subset ringan). */
export type DispositionComposeLetter = {
  id: number;
  letter_number: string;
  subject: string;
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
  // --- Smart Academy --- (`academyRoot` = bottom-tab navigator per peran; layar di bawah = root-stack)
  [ROUTES.academyRoot]: NavigatorScreenParams<AcademyTabParamList> | undefined;
  [ROUTES.academyProgramDetail]: { programId: number; pov?: AcademyProgramPov };
  [ROUTES.academyMaterial]: { programId: number; componentId: number; materialId?: number; title?: string };
  [ROUTES.academyAssessmentIntro]: { assessmentId: number; programId: number; title?: string };
  [ROUTES.academyAttempt]: { attemptId: number; assessmentId: number; programId: number };
  [ROUTES.academyAttemptResult]: { attemptId: number; programId?: number };
  [ROUTES.academyPracticalEntry]: { practicalId: number; programId: number; title?: string };
  [ROUTES.academyResultDetail]: { programId: number; title?: string };
  [ROUTES.academyCompetencyDetail]: { competencyId: number; name?: string };
  [ROUTES.academyInsProgramDetail]: { programId: number; title?: string };
  [ROUTES.academyInsVerificationDetail]: { item: AcademyVerificationItem };
  [ROUTES.academyCmdAttention]: undefined;
  [ROUTES.academyCmdProgramDetail]: { programId: number; title?: string };
  [ROUTES.academyCmdCompetency]: undefined;
  [ROUTES.catalogList]: { resource: CatalogResourceKey };
  [ROUTES.catalogDetail]: { resource: CatalogResourceKey; id: string; initialTab?: string };
  [ROUTES.profile]: undefined;
  [ROUTES.editProfile]: undefined;
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
  // Prakiraan Cuaca BMKG — dibuka dari widget cuaca di Home.
  [ROUTES.weather]: undefined;
  // Peringatan Dini Cuaca Ekstrem BMKG — dibuka dari banner peringatan di Home.
  [ROUTES.weatherAlerts]: undefined;
  // Gempa Bumi BMKG (InaTEWS) — dibuka dari widget gempa di Home.
  [ROUTES.earthquake]: undefined;
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
    personnelPhoto?: string | null;
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
  // --- Disposisi Surat ---
  // Kotak masuk disposisi (disposisi yang ditujukan ke user). Tidak ada tab "terkirim" —
  // komandan melacak disposisi terbitannya lewat detail surat masuk.
  [ROUTES.dispositionList]: undefined;
  [ROUTES.dispositionDetail]: { id: number };
  [ROUTES.dispositionFollowUp]: { id: number; dispositionNumber?: string; subject?: string };
  // `dispositionId` diisi → mode ubah draf (PUT). `incomingLetter` = surat terpilih.
  // `recipients` di-merge kembali dari layar Cari & Pilih Penerima.
  [ROUTES.dispositionCompose]:
    | {
        incomingLetter?: DispositionComposeLetter;
        dispositionId?: number;
        recipients?: PersonnelSearchItem[];
      }
    | undefined;
  [ROUTES.dispositionRecipientSearch]: { selectedIds: number[] };
  // `pickerMode` → dibuka dari layar Buat Disposisi untuk MEMILIH surat (kembali ke Compose
  // dengan merge param), bukan alur berdiri sendiri.
  [ROUTES.incomingLetterList]: { pickerMode?: boolean } | undefined;
  [ROUTES.incomingLetterCreate]: undefined;
  [ROUTES.incomingLetterDetail]: { id: number; pickerMode?: boolean };
  // --- Tagihan Koperasi ---
  [ROUTES.coopBills]: undefined;
  // Tanpa `reportId` → tagihan milik sendiri (`/me/{row}`, bisa ekspor). Dengan `reportId` →
  // tampilan pengelola (`/{report}/members/{row}`, tanpa ekspor).
  [ROUTES.coopBillDetail]: { rowId: number; reportId?: number; periodLabel?: string };
  [ROUTES.coopReports]: undefined;
  // `canExport` = `capabilities.can_export` dari `GET /coop-salary-report` (detail rekap tak membawa
  // capabilities sendiri).
  [ROUTES.coopReportDetail]: { reportId: number; periodLabel?: string; canExport?: boolean };
};

export type MainTabParamList = {
  [ROUTES.home]: undefined;
  [ROUTES.riwayat]: undefined;
  [ROUTES.emergency]: undefined;
  [ROUTES.bukuSaku]: undefined;
  [ROUTES.academy]: undefined;
};

// Tab internal Smart Academy — subset yang dirender tergantung peran (AcademyTabNavigator).
export type AcademyTabParamList = {
  [ROUTES.academyTabHome]: undefined;
  [ROUTES.academyTabPrograms]: undefined;
  [ROUTES.academyTabResults]: undefined;
  [ROUTES.academyTabCompetencies]: undefined;
  [ROUTES.academyTabVerifications]: undefined;
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
