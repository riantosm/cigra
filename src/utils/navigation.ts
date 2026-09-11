import type { NavigationProp } from '@react-navigation/native';

import { ROUTES } from '@/navigation/paths';
import type { RootStackParamList } from '@/navigation/types';

// Dua layar yang saling bisa buka satu sama lain lewat ikon di header (Peta Personel <-> Lokasi
// Personel). Navigasi seperti biasa (push) — KECUALI layar SEBELUMNYA di stack sudah layar tujuan
// itu sendiri (baru saja datang dari sana): waktu itu cukup `goBack()`, supaya bolak-balik dua
// layar ini tidak numpuk push baru terus-menerus (Home → Peta → Lokasi → Peta → Lokasi → …).
type CrossLinkedRoute = typeof ROUTES.personnelMap | typeof ROUTES.personnelTracking;

export function navigateOrBack(navigation: NavigationProp<RootStackParamList>, routeName: CrossLinkedRoute): void {
  const state = navigation.getState();
  const prevRoute = state.routes[state.index - 1];
  if (prevRoute?.name === routeName) {
    navigation.goBack();
    return;
  }
  navigation.navigate(routeName);
}
