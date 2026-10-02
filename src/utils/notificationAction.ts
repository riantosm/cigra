import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ROUTES } from '@/navigation/paths';
import type { RootStackParamList } from '@/navigation/types';
import type { AppNotification } from '@/types';
import { canManageRollCall, isRollCallRepresentative } from '@/utils/rollCall';

// Kelompok tampilan (ikon + warna) satu notifikasi. Backend memakai banyak `type` yang tidak
// konsisten (`panic_button`, `disposition_follow_up`, `roll_call_dibuka`, …), jadi dikelompokkan
// dari `type` + `action.type` — varian baru dengan awalan yang sama ikut kepetakan otomatis.
export type NotificationCategory =
  | 'emergency'
  | 'announcement'
  | 'disposition'
  | 'roll_call'
  | 'info'
  | 'system';

// Cukup `navigate` — supaya prop navigasi layar mana pun (route-nya beda-beda) bisa dioper.
export type NotificationNavigation = Pick<NativeStackNavigationProp<RootStackParamList>, 'navigate'>;

export interface NotificationLink {
  label: string;
  open: (navigation: NotificationNavigation) => void;
}

function asId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

function asNumericId(value: unknown): number | null {
  const id = asId(value);
  if (!id) return null;
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function notificationCategory(item: AppNotification): NotificationCategory {
  const type = item.type ?? '';
  const actionType = item.action?.type ?? '';
  if (
    type === 'emergency' ||
    type === 'panic_button' ||
    actionType === 'emergency' ||
    actionType === 'emergency_list'
  ) {
    return 'emergency';
  }
  if (type.includes('disposition') || actionType.includes('disposition')) return 'disposition';
  if (type.startsWith('roll_call') || actionType === 'roll_call') return 'roll_call';
  if (type === 'announcement' || type === 'system') return type;
  return 'info';
}

// Tombol aksi di pop-up notifikasi (MessageDetailSheet) — `null` kalau notifikasi tidak bertaut ke
// layar mana pun, atau layarnya tidak bisa dibuka oleh peran user ini.
export function resolveNotificationLink(
  item: AppNotification,
  roles: string[] | null | undefined,
): NotificationLink | null {
  const action = item.action;
  const actionType = action?.type ?? '';
  const category = notificationCategory(item);

  // Perintah Tugas (`source: 'directive'`) ikut sirene seperti sinyal darurat, tapi belum ada
  // layarnya di app — jangan arahkan ke detail sinyal darurat.
  if (action?.source === 'directive') return null;

  if (category === 'emergency') {
    const panicId = asId(action?.panic_button_id) ?? asId(action?.id);
    if (panicId && actionType !== 'emergency_list') {
      return {
        label: 'Buka Detail Darurat',
        open: navigation => navigation.navigate(ROUTES.emergencyDetail, { id: panicId }),
      };
    }
    return {
      label: 'Buka Daftar Darurat',
      open: navigation => navigation.navigate(ROUTES.emergencyList),
    };
  }

  if (category === 'disposition') {
    const dispositionId =
      asNumericId(action?.disposition_id) ?? (actionType === 'disposition' ? asNumericId(action?.id) : null);
    if (dispositionId && actionType !== 'disposition_list') {
      return {
        label: 'Buka Detail Disposisi',
        open: navigation => navigation.navigate(ROUTES.dispositionDetail, { id: dispositionId }),
      };
    }
    return {
      label: 'Buka Daftar Disposisi',
      open: navigation => navigation.navigate(ROUTES.dispositionList),
    };
  }

  if (category === 'roll_call') {
    // Agenda baru dibuka → perwakilan kompi diminta mengisi kehadiran kompinya. Komandan / piket
    // diarahkan ke rangkuman agendanya. Anggota biasa tidak punya akses ke layar apel.
    const isOpened = action?.event === 'dibuka' || action?.status === 'open';
    const canManage = canManageRollCall(roles);
    if (isRollCallRepresentative(roles) && (isOpened || !canManage)) {
      return {
        label: 'Isi Kehadiran Kompi',
        open: navigation => navigation.navigate(ROUTES.rollCallCompanyAgendas),
      };
    }
    if (canManage) {
      const agendaId = asNumericId(action?.agenda_id);
      if (agendaId) {
        return {
          label: 'Buka Agenda Apel',
          open: navigation => navigation.navigate(ROUTES.rollCallAgendaDetail, { id: agendaId }),
        };
      }
      return {
        label: 'Buka Kekuatan Apel',
        open: navigation => navigation.navigate(ROUTES.rollCallAgendas),
      };
    }
    return null;
  }

  // Pengumuman tidak punya endpoint detail — isi lengkapnya sudah tampil di pop-up; tombolnya
  // membuka daftar semua pengumuman.
  if (category === 'announcement' || actionType === 'announcement') {
    return {
      label: 'Lihat Semua Pengumuman',
      open: navigation => navigation.navigate(ROUTES.announcements),
    };
  }

  return null;
}
