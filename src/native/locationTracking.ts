import { NativeModules, Platform } from 'react-native';

interface LocationTrackingNativeModule {
  startTracking(): Promise<void>;
  stopTracking(): Promise<void>;
  syncAuthToken(token: string | null): void;
  getStoredAuthToken(): Promise<string | null>;
  isLocationServicesEnabled(): Promise<boolean>;
}

const noopModule: LocationTrackingNativeModule = {
  startTracking: async () => {},
  stopTracking: async () => {},
  syncAuthToken: () => {},
  getStoredAuthToken: async () => null,
  // iOS belum punya implementasi native-nya sendiri (lihat komentar di bawah) — anggap selalu aktif,
  // sama seperti fallback iOS lain di utils/location.ts (isLocationPermissionGranted).
  isLocationServicesEnabled: async () => true,
};

// Modul native baru ada di sisi Android (foreground service + boot receiver).
// iOS jatuh ke no-op sampai ada implementasi background-location-nya sendiri.
export const locationTracking: LocationTrackingNativeModule =
  Platform.OS === 'android' ? (NativeModules.LocationTrackingModule ?? noopModule) : noopModule;
