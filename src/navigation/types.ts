import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { ROUTES } from '@/navigation/paths';
import type {
  HandbookChapter,
  HealthRecordDetail,
  PatrolMonitoringSession,
  PatrolRoute,
  PersonnelSearchItem,
  RollCallSessionType,
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
  // Tab bawah (Home / Buku Saku / Emergency / Riwayat / Profile) — param untuk nested-navigate
  // ke tab tertentu dari layar root-stack, mis. `navigate(ROUTES.main, { screen: ROUTES.profile })`.
  [ROUTES.main]: NavigatorScreenParams<MainTabParamList> | undefined;
  [ROUTES.catalogList]: { resource: CatalogResourceKey };
  [ROUTES.catalogDetail]: { resource: CatalogResourceKey; id: string; initialTab?: string };
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
  [ROUTES.rollCallAgendas]: undefined;
  [ROUTES.rollCallAgendaCreate]: undefined;
  // `deadline` (ISO) dibawa dari daftar agenda — GET /roll-calls/agenda/{id} tidak membawanya.
  // Tanpa param (mis. dibuka dari tempat lain) baris "Batas pengisian" disembunyikan.
  [ROUTES.rollCallAgendaDetail]: { id: number; deadline?: string | null };
  [ROUTES.rollCallCompanyAgendas]: undefined;
  [ROUTES.rollCallCompanyForm]: { agendaId: number; unitId: number; companyName?: string };
  [ROUTES.rollCallSettings]: undefined;
  [ROUTES.rollCallSessions]: undefined;
  // `session` diisi = mode ubah; kosong = tambah sesi baru.
  [ROUTES.rollCallSessionForm]: { session?: RollCallSessionType } | undefined;
  [ROUTES.rollCallOfficers]: undefined;
  [ROUTES.rollCallRepresentatives]: undefined;
  // Menunjuk petugas piket, atau perwakilan satu kompi (`current` = perwakilan lama yang akan
  // otomatis digantikan).
  [ROUTES.rollCallAppoint]:
    | { kind: 'officer' }
    | {
        kind: 'representative';
        unitId: number;
        companyName: string;
        current?: { name: string; username: string | null; isActive: boolean } | null;
      };
  [ROUTES.rollCallStats]: undefined;
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
  [ROUTES.coop]: undefined;
  // Tanpa `reportId` → tagihan milik sendiri (`/me/{row}`, bisa ekspor). Dengan `reportId` →
  // tampilan pengelola (`/{report}/members/{row}`, tanpa ekspor).
  [ROUTES.coopBillDetail]: { rowId: number; reportId?: number; periodLabel?: string };
  // `canExport` = `capabilities.can_export` dari `GET /coop-salary-report` (detail rekap tak membawa
  // capabilities sendiri).
  [ROUTES.coopReportDetail]: { reportId: number; periodLabel?: string; canExport?: boolean };
  [ROUTES.coopJuyars]: undefined;
  [ROUTES.coopJuyarAppoint]: undefined;
};

export type MainTabParamList = {
  [ROUTES.home]: undefined;
  [ROUTES.riwayat]: undefined;
  [ROUTES.emergency]: undefined;
  [ROUTES.bukuSaku]: undefined;
  [ROUTES.profile]: undefined;
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
