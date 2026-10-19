import { NativeModules, Platform } from 'react-native';

// Status izin lokasi iOS dari CLLocationManager.
export type IosLocationStatus = 'notDetermined' | 'denied' | 'restricted' | 'whenInUse' | 'always';

interface LocationPermissionNativeModule {
  getStatus(): Promise<IosLocationStatus>;
  // Resolve dengan status setelah pengguna menjawab dialog (atau status sekarang kalau iOS tidak
  // menampilkan dialog lagi).
  request(level: 'whenInUse' | 'always'): Promise<IosLocationStatus>;
  isLocationServicesEnabled(): Promise<boolean>;
}

const noopModule: LocationPermissionNativeModule = {
  getStatus: async () => 'always',
  request: async () => 'always',
  isLocationServicesEnabled: async () => true,
};

// Modul native iOS saja (ios/CigraSmartbattalionApps/LocationPermissionModule.m) — Android memakai
// PermissionsAndroid langsung di utils/location.ts.
export const locationPermission: LocationPermissionNativeModule =
  Platform.OS === 'ios' ? (NativeModules.LocationPermissionModule ?? noopModule) : noopModule;
