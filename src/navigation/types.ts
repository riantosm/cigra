import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { ROUTES } from '@/navigation/paths';

export type CatalogResourceKey =
  | 'personnel'
  | 'persit'
  | 'vehicles'
  | 'weapon-categories'
  | 'weapon-assignments';

export type RootStackParamList = {
  [ROUTES.login]: undefined;
  [ROUTES.forgotPassword]: undefined;
  [ROUTES.changePassword]: undefined;
  [ROUTES.main]: undefined;
  [ROUTES.catalogList]: { resource: CatalogResourceKey };
  [ROUTES.catalogDetail]: { resource: CatalogResourceKey; id: string; initialTab?: string };
  [ROUTES.profile]: undefined;
  [ROUTES.settings]: undefined;
  [ROUTES.comingSoon]: { title: string };
  [ROUTES.personnelMap]: undefined;
  [ROUTES.personnelTracking]: undefined;
  [ROUTES.notifications]: undefined;
  [ROUTES.emergencyList]: undefined;
  [ROUTES.sendAnnouncement]: undefined;
  [ROUTES.alarmSatuan]: undefined;
};

export type MainTabParamList = {
  [ROUTES.home]: undefined;
  [ROUTES.riwayat]: undefined;
  [ROUTES.emergency]: undefined;
  [ROUTES.bukuSaku]: undefined;
  [ROUTES.lainnya]: undefined;
};

export type RootStackScreenProps<RouteName extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, RouteName>;

export type MainTabScreenProps<RouteName extends keyof MainTabParamList> = BottomTabScreenProps<
  MainTabParamList,
  RouteName
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
