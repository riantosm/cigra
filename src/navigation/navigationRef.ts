import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

// Ref global ke NavigationContainer — dipakai untuk navigasi yang dipicu dari LUAR tree React
// (mis. tap notifikasi patroli lewat notifee event handler / cold-start).
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Kalau app baru cold-start, container belum siap saat handler notifikasi jalan — tahan aksinya
// sampai `onReady` NavigationContainer memanggil flushPendingNavigation().
let pendingNavigation: (() => void) | null = null;

export function runWhenNavigationReady(fn: () => void): void {
  if (navigationRef.isReady()) {
    fn();
  } else {
    pendingNavigation = fn;
  }
}

export function flushPendingNavigation(): void {
  if (pendingNavigation && navigationRef.isReady()) {
    const fn = pendingNavigation;
    pendingNavigation = null;
    fn();
  }
}
