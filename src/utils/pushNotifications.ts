import { Platform } from 'react-native';
import Config from 'react-native-config';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  subscribeToTopic,
  unsubscribeFromTopic,
} from '@react-native-firebase/messaging';
import type { RemoteMessage } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility, AuthorizationStatus, EventType } from '@notifee/react-native';
import type { Event } from '@notifee/react-native';
import DeviceInfo from 'react-native-device-info';

import { ROUTES } from '@/navigation/paths';
import { navigationRef, runWhenNavigationReady } from '@/navigation/navigationRef';
import { getAuthToken } from '@/services/api/axiosInstance';
import { registerFcmTokenApi, unregisterFcmTokenApi } from '@/services/api/device.service';
import { clearPatrolOngoingNotification } from '@/utils/patrolNotification';

// Channel Android bersuara sirene — importance HIGH + bypassDnd supaya tetap berbunyi walau HP
// dalam mode Do Not Disturb. `sound: 'siren'` merujuk ke android/app/src/main/res/raw/siren.mp3
// (salinan dari src/assets/sound/Siren.mp3). Dipakai untuk SEMUA notifikasi darurat (panic
// button) — tidak dapat dimatikan/diganti user, disengaja supaya sinyal darurat selalu menonjol.
//
// PENTING: setelan channel Android (sound, importance, bypassDnd) terkunci begitu channel
// dengan ID tertentu pernah dibuat di suatu device — panggilan createChannel() berikutnya
// dengan ID yang sama diam-diam diabaikan meski isinya beda. Kalau perlu ubah setelan channel
// lagi di masa depan, ganti ID ini (mis. jadi _v4) supaya Android membuat channel baru.
const SIREN_CHANNEL_ID = 'smart_battalion_alerts_v3';
const SIREN_SOUND = 'siren';
// 5x getar panjang (800ms) berturut-turut, dipisah jeda 300ms. Semua nilai harus > 0.
const SIREN_VIBRATION_PATTERN = [100, 800, 300, 800, 300, 800, 300, 800, 300, 800];

// Channel kedua bersuara/getar bawaan sistem (bukan sirene) — dipakai untuk SEMUA notifikasi
// non-darurat (disposisi, pengumuman, dll). Juga jadi `default_notification_channel_id` di
// AndroidManifest.xml (channel yang dipakai Android untuk auto-display notifikasi non-darurat
// saat app background/killed).
const NORMAL_CHANNEL_ID = 'smart_battalion_alerts_normal_v1';

const BROADCAST_TOPIC = Config.FCM_TOPIC || 'all_users';

async function ensureAlertChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: SIREN_CHANNEL_ID,
    name: 'Peringatan Darurat (Sirene)',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: SIREN_SOUND,
    vibration: true,
    vibrationPattern: SIREN_VIBRATION_PATTERN,
    bypassDnd: true,
  });
  await notifee.createChannel({
    id: NORMAL_CHANNEL_ID,
    name: 'Notifikasi',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
  });
}

// Android 13+ butuh izin runtime terpisah untuk menampilkan notifikasi sama sekali.
async function ensureNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.requestPermission();
}

// Cek status izin notifikasi tanpa memicu dialog permintaan izin — dipakai untuk menampilkan
// status di UI (mis. panel pengaturan di Profile). notifee menormalkan cek ini lintas platform.
export async function isNotificationPermissionGranted(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
}

// pressAction khusus notifikasi sirene — tap-nya membuka layar sesuai `source` payload
// (lihat openAlertTarget). Notifikasi biasa tetap `'default'` (cuma membuka app).
const ALERT_PRESS_ACTION_ID = 'alert-open';

// Kunci payload push darurat yang disimpan ke notifikasi lokal supaya bisa dibaca lagi saat
// di-tap. Semua string (FCM data selalu string).
const ALERT_DATA_KEYS = ['source', 'id', 'panic_button_id', 'directive_id', 'directive_recipient_id'] as const;

function pickAlertData(data: RemoteMessage['data']): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const key of ALERT_DATA_KEYS) {
    const value = data?.[key];
    if (typeof value === 'string' && value) picked[key] = value;
  }
  return picked;
}

async function showAlertNotification(
  title: string | undefined,
  body: string | undefined,
  channelId: string,
  alertData?: Record<string, string>,
): Promise<void> {
  const isSiren = channelId === SIREN_CHANNEL_ID;
  await notifee.displayNotification({
    title,
    body,
    data: alertData,
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      // Diset ulang di level notifikasi (bukan cuma channel) — beberapa ROM (mis. Samsung One
      // UI) kadang tidak konsisten mewarisi sound/vibrationPattern dari channel saja.
      ...(isSiren ? { sound: SIREN_SOUND, vibrationPattern: SIREN_VIBRATION_PATTERN } : {}),
      pressAction: isSiren ? { id: ALERT_PRESS_ACTION_ID, launchActivity: 'default' } : { id: 'default' },
    },
  });
}

// Dipakai baik oleh onMessage (foreground, `isForeground: true`) maupun
// setBackgroundMessageHandler (index.js, background/killed — `isForeground` diabaikan/false).
//
// Notifikasi sirene dikirim backend sebagai pesan DATA-ONLY (`data.type === 'emergency'`, TANPA
// field `notification`). `data.source` membedakan asalnya: `panic_button` (sinyal darurat) atau
// `directive` (Perintah Tugas prioritas high/urgent) — keduanya bersirene, bedanya cuma tujuan
// saat di-tap (openAlertTarget) — supaya Android tidak pernah auto-display-kan
// sendiri lewat channel default saat app background/killed; app SELALU yang tampilkan manual di
// semua state (data-only TIDAK PERNAH di-auto-display Android, apapun state-nya), jadi sirene
// konsisten bunyi baik app lagi kebuka atau tidak.
//
// Tipe lain (disposisi, pengumuman, test push dari Firebase Console, dll) dikirim sebagai pesan
// `notification` biasa. Pesan begini HANYA ditampilkan manual di sini saat `isForeground` —
// FCM TIDAK otomatis menampilkan notifikasi saat app di foreground, jadi manual di sini memang
// wajib. Saat app background/killed, Android SUDAH auto-display-kan pesan `notification` ini
// sendiri lewat `default_notification_channel_id` (AndroidManifest.xml) — kalau di sini tetap
// dipanggil juga, notifikasi yang sama muncul DOBEL (dua notifId beda, channel sama). Makanya di
// background/killed pesan bertipe `notification` di-skip total, biar Android yang urus sendiri.
export async function displayRemoteMessage(
  remoteMessage: RemoteMessage,
  options?: { isForeground?: boolean },
): Promise<void> {
  const { notification, data } = remoteMessage;

  if (data?.type === 'emergency') {
    const title = typeof data.title === 'string' ? data.title : notification?.title;
    const body = typeof data.body === 'string' ? data.body : notification?.body;
    await showAlertNotification(title, body, SIREN_CHANNEL_ID, pickAlertData(data));
    return;
  }

  if (!notification || !options?.isForeground) return;
  await showAlertNotification(notification.title, notification.body, NORMAL_CHANNEL_ID);
}

// Tujuan tap notifikasi sirene: `directive` → layar Notifikasi (belum ada layar/endpoint
// Perintah Tugas di app); `panic_button` (atau payload lama tanpa `source`) → detail sinyal
// darurat, atau daftarnya kalau payload tidak membawa id.
function openAlertTarget(data: Record<string, unknown> | undefined): void {
  const source = typeof data?.source === 'string' ? data.source : 'panic_button';
  const rawId = data?.panic_button_id ?? data?.id;
  const panicId = typeof rawId === 'string' && rawId ? rawId : null;

  runWhenNavigationReady(() => {
    // Sesi sudah logout — jangan buka layar yang butuh login.
    const current = navigationRef.getCurrentRoute()?.name;
    if (current === ROUTES.login || current === ROUTES.forgotPassword) return;

    if (source === 'directive') {
      navigationRef.navigate(ROUTES.notifications as never);
    } else if (panicId) {
      navigationRef.navigate(ROUTES.emergencyDetail, { id: panicId });
    } else {
      navigationRef.navigate(ROUTES.emergencyList as never);
    }
  });
}

function isAlertPress(event: Event): boolean {
  return event.type === EventType.PRESS && event.detail.pressAction?.id === ALERT_PRESS_ACTION_ID;
}

// Tap notifikasi sirene saat app di foreground. Dipanggil sekali dari App; mengembalikan
// fungsi unsubscribe.
export function registerAlertNotificationForegroundHandler(): () => void {
  return notifee.onForegroundEvent(event => {
    if (isAlertPress(event)) openAlertTarget(event.detail.notification?.data);
  });
}

// Tap notifikasi sirene saat app di background/killed. Dipanggil dari index.js.
export async function handleAlertNotificationBackgroundEvent(event: Event): Promise<void> {
  if (isAlertPress(event)) openAlertTarget(event.detail.notification?.data);
}

// App dibuka dari keadaan mati (killed) lewat tap notifikasi sirene.
export async function consumeAlertInitialNotification(): Promise<void> {
  try {
    const initial = await notifee.getInitialNotification();
    if (initial?.pressAction?.id === ALERT_PRESS_ACTION_ID) openAlertTarget(initial.notification.data);
  } catch {
    // abaikan
  }
}

// Single-flight: initializePushNotifications bisa dipanggil beruntun (RootNavigator memanggilnya
// saat isLogin lalu lagi saat `roles` berubah sesudah refreshUser) sebelum setup pertama selesai.
// Dengan flag boolean yang baru di-set di akhir, panggilan kedua ikut lolos dan mendaftarkan
// listener onMessage KEDUA — tiap push foreground jadi tampil dobel. Semua pemanggil menunggu
// promise yang sama.
let firebaseReadyPromise: Promise<void> | null = null;
let unsubscribeOnMessage: (() => void) | null = null;
let unsubscribeOnTokenRefresh: (() => void) | null = null;
let subscribedTopics: string[] = [];
// Token FCM terakhir yang berhasil didaftarkan ke backend — supaya tidak POST ulang token yang
// sama tiap kali initializePushNotifications dipanggil (mis. saat role berubah).
let registeredFcmToken: string | null = null;

// Daftarkan / perbarui FCM token perangkat ini ke backend (`POST /devices/firebase-token`),
// dipakai untuk push yang dikirim per-user (disposisi, pengumuman, darurat). Backend menyimpan
// token per perangkat (dikunci `device_id`), jadi token perangkat lain milik user yang sama
// (tablet, web) tidak tertimpa. Best-effort: kegagalan tidak boleh mengganggu setup push lainnya.
async function registerFcmTokenWithBackend(token: string | null | undefined): Promise<void> {
  if (!token || token === registeredFcmToken) return;
  try {
    const [deviceId, deviceName] = await Promise.all([
      DeviceInfo.getUniqueId(),
      DeviceInfo.getDeviceName().catch(() => ''),
    ]);
    await registerFcmTokenApi({
      fcm_token: token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      device_id: deviceId,
      device_name: deviceName || DeviceInfo.getModel() || undefined,
    });
    registeredFcmToken = token;
  } catch {
    // Backend belum siap / offline — coba lagi saat init berikutnya atau saat token di-refresh.
  }
}

// Selain BROADCAST_TOPIC (semua device), device juga subscribe ke satu topic per role yang
// dimiliki user (mis. "komandan", "anggota") — jadi backend bisa kirim FCM cuma ke topic role
// tertentu dan hanya device dengan role itu yang menerima, tanpa perlu simpan token per-device.
function resolveTopics(roles: string[]): string[] {
  const roleTopics = roles.map(role => role.trim()).filter(Boolean);
  return [BROADCAST_TOPIC, ...new Set(roleTopics)];
}

// Setup Firebase/Notifee sekali saja (izin, channel, token, listener foreground) — idempoten,
// terpisah dari sinkronisasi topic di bawah supaya perubahan role tidak perlu setup ulang.
function ensureFirebaseReady(): Promise<void> {
  if (!firebaseReadyPromise) {
    firebaseReadyPromise = setupFirebase().catch(error => {
      // Gagal (mis. Firebase belum dikonfigurasi) — reset supaya init berikutnya bisa mencoba lagi.
      firebaseReadyPromise = null;
      throw error;
    });
  }
  return firebaseReadyPromise;
}

async function setupFirebase(): Promise<void> {
  await ensureNotificationPermission();
  await ensureAlertChannels();

  const messaging = getMessaging();
  const token = await getToken(messaging);
  await registerFcmTokenWithBackend(token);

  unsubscribeOnMessage = onMessage(messaging, async remoteMessage => {
    await displayRemoteMessage(remoteMessage, { isForeground: true });
  });

  // FCM bisa merotasi token kapan saja (mis. restore app, clear data) — daftarkan yang baru.
  unsubscribeOnTokenRefresh = onTokenRefresh(messaging, async newToken => {
    await registerFcmTokenWithBackend(newToken);
  });
}

// Menyamakan topic yang di-subscribe dengan `roles` saat ini: subscribe topic yang baru muncul,
// unsubscribe topic yang sudah tidak ada di roles (mis. role dicabut admin tanpa user logout).
// Aman dipanggil berkali-kali dengan roles yang sama — hanya melakukan diff, tidak re-subscribe
// topic yang memang tidak berubah.
async function syncSubscribedTopics(roles: string[]): Promise<void> {
  const messaging = getMessaging();
  const desiredTopics = resolveTopics(roles);

  const toSubscribe = desiredTopics.filter(topic => !subscribedTopics.includes(topic));
  const toUnsubscribe = subscribedTopics.filter(topic => !desiredTopics.includes(topic));

  await Promise.all([
    ...toSubscribe.map(topic => subscribeToTopic(messaging, topic)),
    ...toUnsubscribe.map(topic => unsubscribeFromTopic(messaging, topic)),
  ]);

  subscribedTopics = desiredTopics;
}

// Dipanggil setiap kali ada sesi login aktif ATAU roles user berubah (termasuk sesi yang
// dipulihkan dari redux-persist, dan saat refreshUser mengembalikan roles baru — lihat
// RootNavigator, effect-nya depend ke `roles` supaya perubahan role langsung men-trigger ini).
// `roles` = AuthUser.roles (mis. ['komandan'] atau ['anggota']). Best-effort: kalau
// google-services.json belum ada, Firebase belum terkonfigurasi dan semua panggilan di bawah
// akan gagal — dibiarkan gagal senyap supaya tidak mengganggu fitur lain.
export async function initializePushNotifications(roles: string[] = []): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await ensureFirebaseReady();
    await syncSubscribedTopics(roles);
    // Kalau registrasi token ke backend gagal saat ensureFirebaseReady (mis. backend sempat
    // offline), coba lagi tiap init berikutnya — no-op kalau token sudah terdaftar.
    if (!registeredFcmToken) {
      await registerFcmTokenWithBackend(await getToken(getMessaging()));
    }
  } catch {
    // Firebase belum dikonfigurasi (belum ada google-services.json) — abaikan, coba lagi nanti.
  }
}

// Token FCM perangkat saat ini, atau null kalau Firebase belum terkonfigurasi / lambat —
// dibatasi 5 dtk supaya logout (yang menunggu teardown) tidak tertahan.
async function readCurrentFcmToken(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));
    return (await Promise.race([getToken(getMessaging()), timeout])) || null;
  } catch {
    return null;
  }
}

export async function teardownPushNotifications(): Promise<void> {
  // Notifikasi "Patroli berjalan" tidak boleh menggantung setelah logout.
  await clearPatrolOngoingNotification();

  // Lepas token perangkat INI di backend (`DELETE /devices/firebase-token` + `{ token }`) supaya
  // server tidak mengirim push ke device ini setelah logout — perangkat lain milik user (tablet,
  // web) tetap terdaftar. Token diambil ulang dari SDK kalau pendaftaran sebelumnya gagal /
  // belum terjadi di sesi app ini, supaya device yang logout tidak tetap menerima push. Tanpa
  // token sama sekali → DELETE dilewati (DELETE tanpa body melepas SEMUA perangkat user).
  // Harus dipanggil SEBELUM token auth dibersihkan (lihat urutan di authSlice.logout). Best-effort.
  // Tanpa token auth (sesi sudah dihapus, mis. logout karena 401) DELETE juga dilewati — backend
  // pasti membalas 401 dan tidak ada gunanya.
  const hasSession = !!(await getAuthToken());
  const tokenToRemove = hasSession ? registeredFcmToken ?? (await readCurrentFcmToken()) : null;
  if (tokenToRemove) {
    try {
      await unregisterFcmTokenApi(tokenToRemove);
    } catch {
      // abaikan — sesi mungkin sudah tidak valid.
    }
  }
  registeredFcmToken = null;

  if (Platform.OS !== 'android' || !firebaseReadyPromise) return;

  // Tunggu setup yang mungkin masih berjalan, supaya listener-nya tidak terdaftar SESUDAH dilepas.
  await firebaseReadyPromise.catch(() => {});
  unsubscribeOnMessage?.();
  unsubscribeOnMessage = null;
  unsubscribeOnTokenRefresh?.();
  unsubscribeOnTokenRefresh = null;
  firebaseReadyPromise = null;

  try {
    const messaging = getMessaging();
    await Promise.all(subscribedTopics.map(topic => unsubscribeFromTopic(messaging, topic)));
  } catch {
    // abaikan — token/izin mungkin sudah tidak valid saat logout.
  } finally {
    subscribedTopics = [];
  }
}
