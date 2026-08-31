import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import LocationStatusBadge from '@/components/molecules/LocationStatusBadge';
import OpenMapsButton from '@/components/molecules/OpenMapsButton';
import PersonnelMap from '@/components/organisms/PersonnelMap';
import { colors } from '@/theme/colors';
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

  return (
    <View style={styles.section}>
      <Card style={styles.statusRow}>
        <LocationStatusBadge status={status} timestamp={locationDetail?.location?.captured_at} />
        {locationDetail?.location ? (
          <View style={styles.updatedBlock}>
            <Text style={styles.updatedLabel}>Diperbarui terakhir</Text>
            <Text style={styles.updatedValue}>
              {formatDateTime(locationDetail.location.captured_at) ?? '-'}
            </Text>
          </View>
        ) : null}
      </Card>

      {locationDetail?.location ? (
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
                status: locationDetail.status,
                location: locationDetail.location,
                last_seen: locationDetail.location.captured_at,
              },
            ]}
            interactive={false}
            style={styles.map}
          />
          <OpenMapsButton
            latitude={locationDetail.location.latitude}
            longitude={locationDetail.location.longitude}
          />
        </>
      ) : (
        <View style={styles.empty}>
          <Icon name="map-pin" size={28} color={colors.textMuted} />
          <Text style={styles.emptyText}>Belum ada data lokasi.</Text>
        </View>
      )}

      <Card style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Icon name="history" size={18} color={colors.primary} />
          <Text
            style={styles.historyTitle}
          >{`Histori Pergerakan (${RECENT_HISTORY_COUNT} Terakhir)`}</Text>
        </View>
        {recentHistory.length === 0 ? (
          <Text style={styles.historyEmpty}>Belum ada riwayat pergerakan.</Text>
        ) : (
          visibleHistory.map((point, index) => (
            <PressableScale
              key={`${point.captured_at}-${index}`}
              onPress={() =>
                openCoordinatesInMaps(point.latitude, point.longitude)
              }
              contentStyle={[
                styles.historyRow,
                index === visibleHistory.length - 1 &&
                  !hasMoreHistory &&
                  styles.historyRowLast,
              ]}
            >
              <View style={styles.historyIconCircle}>
                <Icon name="clock" size={14} color={colors.primary} />
              </View>
              <View style={styles.historyRowText}>
                <Text style={styles.historyRowTitle}>
                  {formatDateTime(point.captured_at) ?? '-'}
                </Text>
                <Text style={styles.historyRowSubtitle}>
                  {`${point.latitude.toFixed(5)}, ${point.longitude.toFixed(
                    5,
                  )}`}
                  {point.accuracy != null
                    ? `  ·  ±${Math.round(point.accuracy)} m`
                    : ''}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.textMuted} />
            </PressableScale>
          ))
        )}
        {hasMoreHistory ? (
          <PressableScale
            onPress={() => setVisibleHistoryCount(recentHistory.length)}
            contentStyle={styles.loadMoreButton}
          >
            <Icon name="chevron-down" size={16} color={colors.primary} />
            <Text style={styles.loadMoreLabel}>Muat lebih banyak</Text>
          </PressableScale>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  centerState: {
    marginTop: 32,
  },
  section: {
    marginTop: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  updatedBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  updatedLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  updatedValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  map: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.neutralSurface,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  historyCard: {
    gap: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  historyEmpty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyRowLast: {
    borderBottomWidth: 0,
  },
  historyIconCircle: {
    height: 28,
    width: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  historyRowText: {
    flex: 1,
    gap: 2,
  },
  historyRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  historyRowSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadMoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
