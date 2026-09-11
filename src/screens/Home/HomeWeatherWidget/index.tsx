import { forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StyleProp, ViewStyle } from 'react-native';

import EarthquakeWidget from '@/components/organisms/EarthquakeWidget';
import WeatherAlertBanner from '@/components/organisms/WeatherAlertBanner';
import WeatherLocationSheet from '@/components/organisms/WeatherLocationSheet';
import WeatherWidget from '@/components/organisms/WeatherWidget';
import { useEarthquake } from '@/hooks/useEarthquake';
import { useWeather } from '@/hooks/useWeather';
import { useWeatherAlerts } from '@/hooks/useWeatherAlerts';
import { ROUTES } from '@/navigation/paths';
import type { RootStackParamList } from '@/navigation/types';

export interface HomeWeatherWidgetHandle {
  // Dipanggil oleh handleRefresh tiap Home body saat pull-to-refresh — ikut me-refresh
  // /weather(+reverse-geocode) + /weather/alerts + /earthquake/latest.
  reload: () => Promise<void>;
}

// Container widget cuaca untuk semua body Home (Commander/Member/HealthOfficer): baris grid 2
// kolom (Peringatan Dini Cuaca Ekstrem + Gempa Terkini) di atas widget prakiraan cuaca, plus
// sheet "Ubah Lokasi Cuaca". Semua pemanggilan API cuaca + navigasi ke layar detailnya
// terpusat di sini.
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
    const {
      latest: quake,
      isLoading: quakeLoading,
      error: quakeError,
      reload: reloadQuake,
    } = useEarthquake();
    const [isSheetVisible, setIsSheetVisible] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        reload: async () => {
          await Promise.all([
            reload('refresh'),
            reloadAlerts('refresh'),
            reloadQuake('refresh'),
          ]);
        },
      }),
      [reload, reloadAlerts, reloadQuake],
    );

    return (
      <View style={style}>
        <View style={styles.grid}>
          <WeatherAlertBanner
            alerts={alerts}
            isLoading={alertsLoading}
            error={alertsError}
            onPress={() => navigation.navigate(ROUTES.weatherAlerts)}
          />
          <EarthquakeWidget
            latest={quake}
            isLoading={quakeLoading}
            error={quakeError}
            onPress={() => navigation.navigate(ROUTES.earthquake)}
          />
        </View>
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
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
});

export default HomeWeatherWidget;
