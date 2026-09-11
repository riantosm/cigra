import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import LocationStatusBadge from '@/components/molecules/LocationStatusBadge';
import OpenMapsButton from '@/components/molecules/OpenMapsButton';
import PersonnelMap from '@/components/organisms/PersonnelMap';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { PersonnelLocationDetail } from '@/types';
import { formatDateTime } from '@/utils/format';
import { openCoordinatesInMaps } from '@/utils/location';

const RECENT_HISTORY_COUNT = 50;
// Jumlah baris histori yang dirender pertama kali — sisanya baru setelah "Muat lebih banyak"
// ditekan. Murni tampilan (client-side); 50 titik-nya sendiri sudah ada semua di data.
const HISTORY_PAGE_SIZE = 5;

export interface LocationPanelPerson {
  id: number;
  serviceNumber: string;
  fullName: string;
  rank: string | null;
  unit: string | null;
  tenantId: number;
  photo?: string | null;
}

export interface LocationPanelProps {
  locationDetail: PersonnelLocationDetail | null;
  isLoading: boolean;
  // Info personel yang lokasinya ditampilkan (dipakai buat marker peta).
  person: LocationPanelPerson;
  // Kalau diisi DAN belum ada data lokasi, panel cuma menampilkan empty-state ini (tanpa kartu
  // histori) — dipakai mis. persit tanpa pasangan prajurit yang bisa dilacak.
  unavailableLabel?: string;
}

// Tab "Lokasi" bersama untuk detail Personel & Persit — status siaran, peta (light/normal), tombol
// buka di Google Maps, dan histori pergerakan (50 terakhir) dengan "muat lebih banyak".
export default function LocationPanel(props: LocationPanelProps) {
  const { locationDetail, isLoading, person, unavailableLabel } = props;
  const [visibleHistoryCount, setVisibleHistoryCount] =
    useState(HISTORY_PAGE_SIZE);

  if (isLoading) {
    return (
      <ActivityIndicator style={styles.centerState} color={colors.primary} />
    );
  }

  if (!locationDetail && unavailableLabel) {
    return (
      <View style={styles.section}>
        <View style={styles.empty}>
          <Icon name="map-pin" size={28} color={colors.textMuted} />
          <Text style={styles.emptyText}>{unavailableLabel}</Text>
        </View>
      </View>
    );
  }

  const recentHistory = [...(locationDetail?.history ?? [])]
    .sort(
      (a, b) =>
        new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime(),
    )
    .slice(0, RECENT_HISTORY_COUNT);
  const visibleHistory = recentHistory.slice(0, visibleHistoryCount);
  const hasMoreHistory = visibleHistoryCount < recentHistory.length;
  const status = locationDetail?.status ?? 'offline';

  const currentLocation = locationDetail?.location ?? null;

  return (
    <View style={styles.section}>
      <View style={styles.statusRow}>
        <LocationStatusBadge status={status} timestamp={currentLocation?.captured_at} emphasis />
      </View>

      {currentLocation ? (
        <>
          <PersonnelMap
            personnel={[
              {
                id: person.id,
                service_number: person.serviceNumber,
                full_name: person.fullName,
                rank: person.rank,
                unit: person.unit,
                tenant_id: person.tenantId,
                status: locationDetail?.status ?? 'offline',
                location: currentLocation,
                last_seen: currentLocation.captured_at,
                photo: person.photo ?? null,
              },
            ]}
            interactive={false}
            style={styles.map}
          />
          <OpenMapsButton
            latitude={currentLocation.latitude}
            longitude={currentLocation.longitude}
          />

          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Koordinat</Text>
              <Text style={styles.metaValue}>
                {`${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`}
              </Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Akurasi</Text>
              <Text style={styles.metaValue}>
                {currentLocation.accuracy != null ? `± ${Math.round(currentLocation.accuracy)} m` : '-'}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Icon name="map-pin" size={28} color={colors.textMuted} />
          <Text style={styles.emptyText}>Belum ada data lokasi.</Text>
        </View>
      )}

      <View style={styles.pillBar}>
        <Text style={styles.pillBarText}>Riwayat Pergerakan</Text>
      </View>
      <View style={styles.historyCard}>
        {recentHistory.length === 0 ? (
          <Text style={styles.historyEmpty}>Belum ada riwayat pergerakan.</Text>
        ) : (
          visibleHistory.map((point, index) => (
            <PressableScale
              key={`${point.captured_at}-${index}`}
              onPress={() => openCoordinatesInMaps(point.latitude, point.longitude)}
              contentStyle={[
                styles.historyRow,
                index === visibleHistory.length - 1 && styles.historyRowLast,
              ]}>
              <View
                style={[
                  styles.historyDot,
                  index === 0 ? styles.historyDotActive : styles.historyDotMuted,
                ]}
              />
              <View style={styles.historyRowText}>
                <Text style={styles.historyRowTitle}>
                  {formatDateTime(point.captured_at) ?? '-'}
                </Text>
                <Text style={styles.historyRowSubtitle}>
                  {`${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`}
                  {point.accuracy != null ? `  ·  ± ${Math.round(point.accuracy)} m` : ''}
                </Text>
              </View>
            </PressableScale>
          ))
        )}
      </View>
      {hasMoreHistory ? (
        <PressableScale
          onPress={() => setVisibleHistoryCount(recentHistory.length)}
          contentStyle={styles.loadMoreButton}>
          <Text style={styles.loadMoreLabel}>Muat lebih banyak</Text>
          <Icon name="chevron-down" size={15} color={colors.primary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centerState: {
    marginTop: 32,
  },
  section: {
    marginTop: 16,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  map: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...cardShadow,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.neutralSurface,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metaCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...cardShadow,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaValue: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '600',
    color: colors.heading,
  },
  pillBar: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: colors.heading,
  },
  pillBarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  historyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    ...cardShadow,
  },
  historyEmpty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  historyRowLast: {
    borderBottomWidth: 0,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  historyDotActive: {
    backgroundColor: colors.primary,
  },
  historyDotMuted: {
    backgroundColor: colors.placeholder,
  },
  historyRowText: {
    flex: 1,
    gap: 2,
  },
  historyRowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.heading,
  },
  historyRowSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${colors.primary}29`,
    backgroundColor: `${colors.primary}14`,
  },
  loadMoreLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
