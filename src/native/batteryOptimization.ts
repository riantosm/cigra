import { NativeModules, Platform } from 'react-native';

interface BatteryOptimizationNativeModule {
  isIgnoringBatteryOptimizations(): Promise<boolean>;
  requestIgnoreBatteryOptimizations(): Promise<void>;
}

const noopModule: BatteryOptimizationNativeModule = {
  isIgnoringBatteryOptimizations: async () => true,
  requestIgnoreBatteryOptimizations: async () => {},
};

export const batteryOptimization: BatteryOptimizationNativeModule =
  Platform.OS === 'android' ? (NativeModules.BatteryOptimizationModule ?? noopModule) : noopModule;
