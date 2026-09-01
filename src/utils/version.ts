import DeviceInfo from 'react-native-device-info';

// Versi + build number diambil dari build native (Android `versionName`/`versionCode`,
// iOS `CFBundleShortVersionString`/`CFBundleVersion`) — bukan `package.json`, yang bisa
// meleset dari yang benar-benar terpasang. `getVersion()`/`getBuildNumber()` sinkron di
// react-native-device-info v10+.
export const appVersion = DeviceInfo.getVersion();

export const appBuildNumber = ((): number | null => {
  const raw = Number(DeviceInfo.getBuildNumber());
  return Number.isFinite(raw) ? raw : null;
})();
