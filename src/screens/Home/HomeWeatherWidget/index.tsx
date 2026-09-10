import { forwardRef, useImperativeHandle, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StyleProp, ViewStyle } from 'react-native';

import WeatherLocationSheet from '@/components/organisms/WeatherLocationSheet';
import WeatherWidget from '@/components/organisms/WeatherWidget';
import { useWeather } from '@/hooks/useWeather';
import { ROUTES } from '@/navigation/paths';
import type { RootStackParamList } from '@/navigation/types';

export interface HomeWeatherWidgetHandle {
  // Dipanggil oleh handleRefresh tiap Home body saat pull-to-refresh — ikut me-refresh
  // /weather/reverse-geocode + /weather (dan /weather/regions saat sheet dibuka lagi).
  reload: () => Promise<void>;
}

// Container widget cuaca untuk semua body Home (Commander/Member/HealthOfficer). Menyimpan
// pemanggilan `useWeather`, sheet "Ubah Lokasi Cuaca" (GET /weather/regions), dan navigasi ke
// layar Prakiraan Cuaca di satu tempat.
const HomeWeatherWidget = forwardRef<HomeWeatherWidgetHandle, { style?: StyleProp<ViewStyle> }>(
  function HomeWeatherWidgetImpl({ style }, ref) {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { weather, isLoading, error, manualRegion, setManualRegion, reload } = useWeather();
    const [isSheetVisible, setIsSheetVisible] = useState(false);

    useImperativeHandle(ref, () => ({ reload: () => reload('refresh') }), [reload]);

    return (
      <>
        <WeatherWidget
          weather={weather}
          isLoading={isLoading}
          error={error}
          manualLabel={manualRegion?.label ?? null}
          onPress={() => navigation.navigate(ROUTES.weather)}
          onChangeLocation={() => setIsSheetVisible(true)}
          style={style}
        />
        <WeatherLocationSheet
          visible={isSheetVisible}
          onClose={() => setIsSheetVisible(false)}
          manualRegion={manualRegion}
          onUseCurrentLocation={() => setManualRegion(null)}
          onSelectRegion={region => setManualRegion(region)}
        />
      </>
    );
  },
);

export default HomeWeatherWidget;
