import { NativeModules, Platform } from 'react-native';

interface LocationTrackingNativeModule {
  startTracking(): Promise<void>;
  stopTracking(): Promise<void>;
  syncAuthToken(token: string | null): void;
}

const noopModule: LocationTrackingNativeModule = {
  startTracking: async () => {},
  stopTracking: async () => {},
  syncAuthToken: () => {},
};

// Modul native baru ada di sisi Android (foreground service + boot receiver).
// iOS jatuh ke no-op sampai ada implementasi background-location-nya sendiri.
export const locationTracking: LocationTrackingNativeModule =
  Platform.OS === 'android' ? (NativeModules.LocationTrackingModule ?? noopModule) : noopModule;
