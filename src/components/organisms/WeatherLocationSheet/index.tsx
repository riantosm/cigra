import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import BottomSheet from '@/components/organisms/BottomSheet';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { regionLabel } from '@/hooks/useWeather';
import type { WeatherManualRegion } from '@/hooks/useWeather';
import { searchWeatherRegionsApi } from '@/services/api/weather.service';
import { colors } from '@/theme/colors';
import type { WeatherRegion } from '@/types';
import { extractErrorMessage, joinFields } from '@/utils/format';
import { getCurrentCoordinates } from '@/utils/location';

const SEARCH_DEBOUNCE_MS = 1000;

export interface WeatherLocationSheetProps {
  visible: boolean;
  onClose: () => void;
  manualRegion: WeatherManualRegion | null;
  onUseCurrentLocation: () => void;
  onSelectRegion: (region: WeatherManualRegion) => void;
}

// Sheet "Ubah Lokasi Cuaca" — dipanggil dari widget cuaca di Home.
// GET /weather/regions: pencarian wilayah + kode ADM4 BMKG (autocomplete) ATAU daftar wilayah
// terdekat via koordinat GPS saat kolom cari masih kosong.
export default function WeatherLocationSheet(props: WeatherLocationSheetProps) {
  const { visible, onClose, manualRegion, onUseCurrentLocation, onSelectRegion } = props;
  const keyboardHeight = useKeyboardHeight();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WeatherRegion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nearby, setNearby] = useState<WeatherRegion[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const trimmed = query.trim();
  const isSearchMode = trimmed.length >= 2;

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setError(null);
      setNearby([]);
      return;
    }
    // Saat sheet dibuka: ambil wilayah terdekat dari GPS (best-effort) untuk ditawarkan
    // sebelum pengguna mengetik.
    let active = true;
    setNearbyLoading(true);
    (async () => {
      try {
        const coords = await getCurrentCoordinates({
          timeout: 8000,
          allowFallbackToLowAccuracy: true,
        });
        const items = await searchWeatherRegionsApi({
          lat: coords.latitude,
          lon: coords.longitude,
          limit: 12,
        });
        if (active) setNearby(items);
      } catch {
        if (active) setNearby([]);
      } finally {
        if (active) setNearbyLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [visible]);

  useEffect(() => {
    if (!isSearchMode) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const items = await searchWeatherRegionsApi({ q: trimmed, limit: 20 });
        setResults(items);
        setError(null);
      } catch (err) {
        setError(extractErrorMessage(err, 'Gagal mencari wilayah.'));
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, isSearchMode]);

  const renderRow = useCallback(
    (region: WeatherRegion) => {
      const label = regionLabel(region);
      const isActive = manualRegion?.adm4 === region.adm4;
      const distance =
        typeof region.distance_km === 'number' ? `±${region.distance_km.toFixed(1)} km` : null;
      return (
        <PressableScale
          key={region.adm4}
          scaleTo={0.98}
          onPress={() => {
            onSelectRegion({ adm4: region.adm4, label });
            onClose();
          }}
          contentStyle={[styles.row, isActive && styles.rowActive]}>
          <Icon name="map-pin" size={15} color={colors.textMuted} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {joinFields(region.desa, region.kecamatan) || label}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {joinFields(region.kotkab, region.provinsi) || `ADM4 ${region.adm4}`}
              {distance ? ` · ${distance}` : ''}
            </Text>
          </View>
          {isActive ? <Icon name="check" size={15} color={colors.primary} /> : null}
        </PressableScale>
      );
    },
    [manualRegion, onClose, onSelectRegion],
  );

  return (
    <BottomSheet visible={visible} onRequestClose={onClose}>
      <View style={[styles.container, { paddingBottom: keyboardHeight || 12 }]}>
        <Text style={styles.title}>Ubah Lokasi Cuaca</Text>

        <PressableScale
          scaleTo={0.98}
          onPress={() => {
            onUseCurrentLocation();
            onClose();
          }}
          contentStyle={[styles.gpsRow, !manualRegion && styles.gpsRowActive]}>
          <View style={styles.gpsIcon}>
            <Icon name="crosshair" size={16} color={colors.primary} />
          </View>
          <View style={styles.gpsText}>
            <Text style={styles.gpsLabel}>Gunakan Lokasi Saat Ini (GPS)</Text>
            <Text style={styles.gpsHint}>Cuaca mengikuti posisi perangkat</Text>
          </View>
          {!manualRegion ? <Icon name="check" size={16} color={colors.primary} /> : null}
        </PressableScale>

        <TextField
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          leftIcon="map-pin"
          placeholder="Cari kelurahan / kecamatan / kota…"
          autoCorrect={false}
          containerStyle={styles.search}
        />

        <View style={styles.resultArea}>
          {isSearchMode ? (
            isSearching ? (
              <ActivityIndicator style={styles.state} color={colors.primary} />
            ) : error ? (
              <Text style={styles.state}>{error}</Text>
            ) : results.length === 0 ? (
              <Text style={styles.state}>Wilayah tidak ditemukan.</Text>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
                {results.map(renderRow)}
              </ScrollView>
            )
          ) : nearbyLoading ? (
            <ActivityIndicator style={styles.state} color={colors.primary} />
          ) : nearby.length > 0 ? (
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
              <Text style={styles.sectionLabel}>WILAYAH TERDEKAT</Text>
              {nearby.map(renderRow)}
            </ScrollView>
          ) : (
            <Text style={styles.state}>Ketik minimal 2 huruf untuk mencari wilayah.</Text>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.heading,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  gpsRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.notifUnreadSurface,
  },
  gpsIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  gpsText: {
    flex: 1,
    gap: 2,
  },
  gpsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  gpsHint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  search: {
    marginBottom: 0,
  },
  resultArea: {
    minHeight: 120,
  },
  state: {
    paddingVertical: 24,
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
  },
  list: {
    maxHeight: 260,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.placeholder,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  rowActive: {
    backgroundColor: colors.notifUnreadSurface,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  rowSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
