import { Linking } from 'react-native';

import { navigationRef, runWhenNavigationReady } from '@/navigation/navigationRef';
import { ROUTES } from '@/navigation/paths';
import { store } from '@/store';

// URL di contentIntent notifikasi pelacakan lokasi ("CIGRA APPS ACTIVE") — harus sama dengan
// NOTIFICATION_URL di android/.../LocationForegroundService.kt.
const TRACKING_NOTIFICATION_URL = 'smartbattalion://tracking-notification';

function openEmergencyTab(): void {
  runWhenNavigationReady(() => {
    // Belum login / masih harus ganti password / bootstrap belum selesai — biarkan guard
    // (RequireAuth/RequireGuest) yang menentukan layarnya.
    const { isLogin, appChecked, requiresPasswordChange } = store.getState().auth;
    if (!isLogin || !appChecked || requiresPasswordChange) return;

    // Tab Emergency ada untuk semua peran; kalau suatu saat tidak terdaftar, jatuh ke Home.
    const tabRouteNames = navigationRef
      .getRootState()
      ?.routes.find(route => route.name === ROUTES.main)?.state?.routeNames;
    if (tabRouteNames && !tabRouteNames.includes(ROUTES.emergency)) {
      navigationRef.navigate(ROUTES.main, { screen: ROUTES.home });
    } else {
      navigationRef.navigate(ROUTES.main, { screen: ROUTES.emergency });
    }
  });
}

// Tap notifikasi pelacakan lokasi: cold start lewat getInitialURL, app yang sudah jalan lewat
// event 'url'. Dipanggil sekali dari App; mengembalikan fungsi unsubscribe.
export function registerTrackingNotificationHandler(): () => void {
  Linking.getInitialURL()
    .then(url => {
      if (url === TRACKING_NOTIFICATION_URL) openEmergencyTab();
    })
    .catch(() => {
      // abaikan
    });
  const subscription = Linking.addEventListener('url', ({ url }) => {
    if (url === TRACKING_NOTIFICATION_URL) openEmergencyTab();
  });
  return () => subscription.remove();
}
