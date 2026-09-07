import { Platform } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import type { Event } from '@notifee/react-native';

import { ROUTES } from '@/navigation/paths';
import { navigationRef, runWhenNavigationReady } from '@/navigation/navigationRef';
import type { PatrolSession } from '@/types';
import { patrolDurationLabel } from '@/utils/patrol';

// Notifikasi lokal "ongoing" selama ada sesi patroli berjalan — tidak bisa di-swipe (ongoing),
// menampilkan progres checkpoint sebagai progress bar, dan tap-nya membuka layar Sesi Berjalan.
// Android-only: iOS tidak mendukung notifikasi non-dismissable / progress bar.
//
// Catatan: setelan channel Android terkunci begitu channel dengan ID tsb pernah dibuat di
// device — ganti suffix ID (mis. _v2) kalau perlu ubah importance/setelan lain nanti.
const PATROL_CHANNEL_ID = 'smart_battalion_patrol_v1';
const PATROL_NOTIFICATION_ID = 'patrol-active-session';
const PATROL_PRESS_ACTION_ID = 'patrol-open-active';

let channelReady = false;

async function ensurePatrolChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  await notifee.createChannel({
    id: PATROL_CHANNEL_ID,
    name: 'Patroli Berjalan',
    // LOW: muncul di shade tanpa bunyi/getar tiap kali progres di-update.
    importance: AndroidImportance.LOW,
  });
  channelReady = true;
}

function patrolNotificationBody(session: PatrolSession): string {
  const parts = [`${session.completed_checkpoints}/${session.total_checkpoints} checkpoint`];
  if (session.route?.name) parts.push(session.route.name);
  parts.push(`berjalan ${patrolDurationLabel(session.started_at)}`);
  return parts.join(' · ');
}

// Idempoten — tampilkan / update / hapus notifikasi ongoing sesuai sesi aktif saat ini.
// Panggil setiap kali data sesi aktif di-refresh (Home, layar Sesi Berjalan, setelah check-in).
export async function syncPatrolOngoingNotification(session: PatrolSession | null): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if (!session || session.status !== 'in_progress') {
      await notifee.cancelNotification(PATROL_NOTIFICATION_ID);
      return;
    }
    await ensurePatrolChannel();
    const max = Math.max(1, session.total_checkpoints);
    const current = Math.max(0, Math.min(max, session.completed_checkpoints));
    await notifee.displayNotification({
      id: PATROL_NOTIFICATION_ID,
      title: 'Patroli berjalan',
      body: patrolNotificationBody(session),
      android: {
        channelId: PATROL_CHANNEL_ID,
        ongoing: true,
        autoCancel: false,
        onlyAlertOnce: true,
        progress: { max, current },
        pressAction: { id: PATROL_PRESS_ACTION_ID, launchActivity: 'default' },
      },
    });
  } catch {
    // Notifee belum siap / izin notifikasi ditolak — bukan alur kritis patroli.
  }
}

export async function clearPatrolOngoingNotification(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.cancelNotification(PATROL_NOTIFICATION_ID);
  } catch {
    // abaikan
  }
}

function openActivePatrol(): void {
  runWhenNavigationReady(() => {
    navigationRef.navigate(ROUTES.patrolActive as never);
  });
}

function isPatrolPress(event: Event): boolean {
  return (
    event.type === EventType.PRESS &&
    event.detail.pressAction?.id === PATROL_PRESS_ACTION_ID
  );
}

// Tap notifikasi patroli saat app di foreground. Dipanggil sekali dari App; mengembalikan
// fungsi unsubscribe.
export function registerPatrolNotificationForegroundHandler(): () => void {
  return notifee.onForegroundEvent(event => {
    if (isPatrolPress(event)) openActivePatrol();
  });
}

// Tap notifikasi patroli saat app di background/killed. Dipanggil dari index.js.
export async function handlePatrolNotificationBackgroundEvent(event: Event): Promise<void> {
  if (isPatrolPress(event)) openActivePatrol();
}

// App dibuka dari keadaan mati (killed) lewat tap notifikasi patroli.
export async function consumePatrolInitialNotification(): Promise<void> {
  try {
    const initial = await notifee.getInitialNotification();
    if (initial?.pressAction?.id === PATROL_PRESS_ACTION_ID) openActivePatrol();
  } catch {
    // abaikan
  }
}
