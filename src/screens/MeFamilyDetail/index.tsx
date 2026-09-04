import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import Badge from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import PersonAvatar from '@/components/molecules/PersonAvatar';
import Card from '@/components/molecules/Card';
import InfoRow from '@/components/molecules/InfoRow';
import OpenMapsButton from '@/components/molecules/OpenMapsButton';
import SectionCard from '@/components/molecules/SectionCard';
import PersonnelMap from '@/components/organisms/PersonnelMap';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  getMyFamilyMemberApi,
  getMyFamilyMemberLocationApi,
} from '@/services/api/me.service';
import { colors } from '@/theme/colors';
import type {
  MeFamilyLocationPoint,
  MeFamilyMemberDetail,
  MeFamilyMemberLocation,
  PersonnelLocationOverviewItem,
} from '@/types';
import {
  extractErrorMessage,
  formatBirth,
  formatDateShort,
  formatDateTime,
  joinFields,
  orDash,
} from '@/utils/format';
import { contentEnterTransition } from '@/utils/motion';

type Props = RootStackScreenProps<typeof ROUTES.meFamilyDetail>;

function hasCoords(point: MeFamilyLocationPoint | null | undefined): point is MeFamilyLocationPoint {
  return (
    !!point &&
    typeof point.latitude === 'number' &&
    typeof point.longitude === 'number' &&
    !(point.latitude === 0 && point.longitude === 0)
  );
}

// Sintetis PersonnelLocationOverviewItem supaya bisa pakai <PersonnelMap> yang sudah ada.
function toMapItem(
  detail: MeFamilyMemberDetail | null,
  point: MeFamilyLocationPoint,
): PersonnelLocationOverviewItem {
  return {
    id: detail?.id ?? 0,
    service_number: detail?.membership_number ?? '',
    full_name: detail?.full_name ?? 'Keluarga',
    rank: null,
    unit: null,
    tenant_id: 0,
    status: 'fresh',
    last_seen: point.captured_at ?? null,
    location: {
      id: detail?.id ?? 0,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy: point.accuracy ?? null,
      altitude: null,
      heading: null,
      speed: null,
      captured_at: point.captured_at ?? '',
      source: point.source ?? '',
    },
  };
}

export default function MeFamilyDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { id, name } = route.params;

  const [detail, setDetail] = useState<MeFamilyMemberDetail | null>(null);
  const [location, setLocation] = useState<MeFamilyMemberLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);
      const [detailResult, locationResult] = await Promise.allSettled([
        getMyFamilyMemberApi(id),
        getMyFamilyMemberLocationApi(id),
      ]);
      if (detailResult.status === 'fulfilled') setDetail(detailResult.value);
      else setErrorMessage(extractErrorMessage(detailResult.reason, 'Gagal memuat data keluarga.'));
      if (locationResult.status === 'fulfilled') setLocation(locationResult.value);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [id],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  const spouse = detail?.husband ?? detail?.wife ?? null;
  const spouseRank = spouse?.rank && spouse.rank !== '-' ? spouse.rank : undefined;
  const birthLabel = formatBirth(
    detail?.birth_place,
    detail?.birth_date_formatted ?? (detail?.birth_date ? formatDateShort(detail.birth_date) : null),
  );
  const currentPoint = location?.current_location ?? detail?.last_location ?? null;
  const mapItem = useMemo(
    () => (hasCoords(currentPoint) ? [toMapItem(detail, currentPoint)] : []),
    [currentPoint, detail],
  );
  const isActive = detail ? detail.status === 'active' : true;

  return (
    <MainLayout
      title={detail?.full_name ?? name ?? 'Anggota Keluarga'}
      subtitle="Data keluarga (Persit)"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => load('refresh')}
              tintColor={colors.primary}
            />
          }>
          <MotiView
            from={{ opacity: 0, translateY: 14 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={contentEnterTransition}>
            {errorMessage && !detail ? (
              <Card style={styles.card}>
                <View style={styles.stateBox}>
                  <Icon name="info" size={22} color={colors.textMuted} />
                  <Text style={styles.stateText}>{errorMessage}</Text>
                </View>
              </Card>
            ) : null}

            <Card style={styles.card}>
              <View style={styles.identityRow}>
                <PersonAvatar
                  photo={detail?.photo_url ?? location?.photo_url ?? null}
                  name={detail?.full_name ?? name ?? '?'}
                  size={64}
                />
                <View style={styles.identity}>
                  <Text style={styles.name}>{detail?.full_name ?? name ?? '-'}</Text>
                  <Badge
                    label={isActive ? 'AKTIF' : 'NONAKTIF'}
                    variant={isActive ? 'success' : 'neutral'}
                  />
                  {detail?.membership_number ? (
                    <View style={styles.identityMetaRow}>
                      <Icon name="id-card" size={14} color={colors.textMuted} />
                      <Text style={styles.identityMetaText}>{detail.membership_number}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Card>

            {detail ? (
              <SectionCard icon="profile" title="Data Keluarga">
                <InfoRow icon="id-card" label="Nomor Anggota" value={orDash(detail.membership_number)} />
                <InfoRow icon="cake" label="Tempat, Tanggal Lahir" value={birthLabel} />
                <InfoRow icon="blood-drop" label="Golongan Darah" value={orDash(detail.blood_type)} />
                <InfoRow icon="briefcase" label="Pekerjaan" value={orDash(detail.occupation)} />
                <InfoRow icon="phone" label="No. Telepon" value={orDash(detail.phone)} />
                <InfoRow icon="map-pin" label="Alamat" value={orDash(detail.address)} />
                {detail.notes ? (
                  <InfoRow icon="info" label="Catatan" value={detail.notes} />
                ) : null}
              </SectionCard>
            ) : null}

            {spouse ? (
              <SectionCard icon="shield-check" title="Prajurit Terkait">
                <InfoRow
                  icon="profile"
                  label="Nama"
                  value={joinFields(spouseRank, spouse.full_name) || spouse.full_name}
                />
                <InfoRow icon="id-card" label="Nomor Dinas" value={orDash(spouse.service_number)} />
              </SectionCard>
            ) : null}

            <View style={styles.locationSection}>
              <View style={styles.locationHeader}>
                <Icon name="map-pin" size={18} color={colors.primary} />
                <Text style={styles.locationTitle}>Lokasi</Text>
              </View>
              {hasCoords(currentPoint) ? (
                <>
                  <PersonnelMap personnel={mapItem} interactive style={styles.map} />
                  {currentPoint.captured_at ? (
                    <Text style={styles.locationMeta}>
                      Terakhir diperbarui: {formatDateTime(currentPoint.captured_at)}
                    </Text>
                  ) : null}
                  <OpenMapsButton
                    latitude={currentPoint.latitude}
                    longitude={currentPoint.longitude}
                    style={styles.mapButton}
                  />
                </>
              ) : (
                <Card style={styles.card}>
                  <View style={styles.stateBox}>
                    <Icon name="map-pin" size={22} color={colors.textMuted} />
                    <Text style={styles.stateText}>Belum ada data lokasi untuk anggota keluarga ini.</Text>
                  </View>
                </Card>
              )}
            </View>
          </MotiView>
        </ScrollView>
      )}
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 96 },
  loader: { marginTop: 48 },
  card: { paddingVertical: 18 },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  identity: { flex: 1, alignItems: 'flex-start', gap: 6 },
  name: { fontSize: 18, fontWeight: '700', color: colors.heading },
  identityMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  identityMetaText: { fontSize: 13, color: colors.textMuted },
  stateBox: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  stateText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  locationSection: { marginTop: 16, gap: 10 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  map: { height: 220, borderRadius: 16, overflow: 'hidden' },
  locationMeta: { fontSize: 12, color: colors.textMuted },
  mapButton: { alignSelf: 'flex-start' },
});
