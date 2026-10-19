import { NativeModules, Platform } from 'react-native';

export interface TrackedLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  // Waktu fix, epoch ms.
  time: number;
}

interface LocationTrackingNativeModule {
  startTracking(): Promise<void>;
  stopTracking(): Promise<void>;
  syncAuthToken(token: string | null): void;
  getStoredAuthToken(): Promise<string | null>;
  isLocationServicesEnabled(): Promise<boolean>;
  getLastLocation(): Promise<TrackedLocation | null>;
}

const noopModule: LocationTrackingNativeModule = {
  startTracking: async () => {},
  stopTracking: async () => {},
  syncAuthToken: () => {},
  getStoredAuthToken: async () => null,
  getLastLocation: async () => null,
  isLocationServicesEnabled: async () => true,
};

// Android: LocationForegroundService + BootReceiver (android/.../cigrasmartbattalionapps/).
// iOS: ios/CigraSmartbattalionApps/LocationTrackingModule.m (CLLocationManager background updates +
// significant-change relaunch). No-op hanya kalau modulnya tidak ter-link (mis. Jest / platform lain).
export const locationTracking: LocationTrackingNativeModule =
  Platform.OS === 'android' || Platform.OS === 'ios' ? (NativeModules.LocationTrackingModule ?? noopModule) : noopModule;
