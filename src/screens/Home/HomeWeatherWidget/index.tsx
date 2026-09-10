import { forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StyleProp, ViewStyle } from 'react-native';

import WeatherAlertBanner from '@/components/organisms/WeatherAlertBanner';
import WeatherLocationSheet from '@/components/organisms/WeatherLocationSheet';
import WeatherWidget from '@/components/organisms/WeatherWidget';
import { useWeather } from '@/hooks/useWeather';
import { useWeatherAlerts } from '@/hooks/useWeatherAlerts';
import { ROUTES } from '@/navigation/paths';
import type { RootStackParamList } from '@/navigation/types';

export interface HomeWeatherWidgetHandle {
  // Dipanggil oleh handleRefresh tiap Home body saat pull-to-refresh — ikut me-refresh
  // /weather/reverse-geocode + /weather + /weather/alerts (dan /weather/regions saat sheet dibuka).
  reload: () => Promise<void>;
}

// Container widget cuaca untuk semua body Home (Commander/Member/HealthOfficer): banner
// Peringatan Dini Cuaca Ekstrem + widget prakiraan cuaca + sheet "Ubah Lokasi Cuaca". Semua
// pemanggilan API cuaca + navigasi ke layar detailnya terpusat di sini.
const HomeWeatherWidget = forwardRef<HomeWeatherWidgetHandle, { style?: StyleProp<ViewStyle> }>(
  function HomeWeatherWidgetImpl({ style }, ref) {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { weather, isLoading, error, manualRegion, setManualRegion, reload } = useWeather();
    const {
      alerts,
      isLoading: alertsLoading,
      error: alertsError,
      reload: reloadAlerts,
    } = useWeatherAlerts();
    const [isSheetVisible, setIsSheetVisible] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        reload: async () => {
          await Promise.all([reload('refresh'), reloadAlerts('refresh')]);
        },
      }),
      [reload, reloadAlerts],
    );

    return (
      <View style={style}>
        <WeatherAlertBanner
          alerts={alerts}
          isLoading={alertsLoading}
          error={alertsError}
          onPress={() => navigation.navigate(ROUTES.weatherAlerts)}
          style={styles.banner}
        />
        <WeatherWidget
          weather={weather}
          isLoading={isLoading}
          error={error}
          manualLabel={manualRegion?.label ?? null}
          onPress={() => navigation.navigate(ROUTES.weather)}
          onChangeLocation={() => setIsSheetVisible(true)}
        />
        <WeatherLocationSheet
          visible={isSheetVisible}
          onClose={() => setIsSheetVisible(false)}
          manualRegion={manualRegion}
          onUseCurrentLocation={() => setManualRegion(null)}
          onSelectRegion={region => setManualRegion(region)}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  banner: {
    marginBottom: 12,
  },
});

export default HomeWeatherWidget;
