/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { displayRemoteMessage } from '@/utils/pushNotifications';
import { handlePatrolNotificationBackgroundEvent } from '@/utils/patrolNotification';

// Wajib didaftarkan di sini (bukan di dalam komponen React) — ini yang dipanggil Firebase saat
// pesan data-only masuk ketika app di background/killed, di luar lifecycle React sepenuhnya.
// Dibungkus try/catch supaya app tetap bisa jalan sebelum google-services.json ada — tanpa
// file itu, getMessaging() melempar error saat Firebase belum terkonfigurasi.
try {
  setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
    await displayRemoteMessage(remoteMessage);
  });
} catch {
  // Firebase belum dikonfigurasi — abaikan, push notification baru aktif setelah setup selesai.
}

// Tap notifikasi "Patroli berjalan" saat app di background/killed → buka layar Sesi Berjalan.
notifee.onBackgroundEvent(async event => {
  await handlePatrolNotificationBackgroundEvent(event);
});

AppRegistry.registerComponent(appName, () => App);
