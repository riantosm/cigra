import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import type { BadgeVariant } from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import Card from '@/components/molecules/Card';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { isDisplayablePhoto } from '@/utils/avatar';
import { formatDateTime, formatRelativeTime, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.emergencyList>;

type EmergencyStatus = 'active' | 'acknowledged' | 'resolved';

interface EmergencyEvent {
  id: string;
  personnel: {
    service_number: string;
    full_name: string;
    rank: string | null;
    unit: string | null;
    photo: string | null;
  };
  latitude: number;
  longitude: number;
  address: string | null;
  description: string | null;
  status: EmergencyStatus;
  created_at: string;
}

const statusLabel: Record<EmergencyStatus, string> = {
  active: 'Aktif',
  acknowledged: 'Ditangani',
  resolved: 'Selesai',
};

const statusBadgeVariant: Record<EmergencyStatus, BadgeVariant> = {
  active: 'danger',
  acknowledged: 'warning',
  resolved: 'success',
};

const statusAvatarGradient: Record<EmergencyStatus, [string, string]> = {
  active: [colors.gradientDangerStart, colors.danger],
  acknowledged: [colors.gradientWarnStart, colors.warning],
  resolved: [colors.gradientSuccessStart, colors.success],
};

// Dummy sementara — belum ada endpoint `GET /panic-buttons` (list). Lihat API_CONTRACT.md; bentuk
// field di sini sengaja disamakan dengan draf kontrak itu supaya tinggal ganti sumber datanya.
const DUMMY_EMERGENCIES: EmergencyEvent[] = [
  {
    id: '1',
    personnel: {
      service_number: '3101050004',
      full_name: 'Praka Rizky Maulana',
      rank: 'Prajurit Satu',
      unit: 'Kompi Senapan A',
      photo: null,
    },
    latitude: -6.15472,
    longitude: 106.85201,
    address: 'Pos Timur, Markas Batalyon',
    description: 'Tombol darurat ditekan.',
    status: 'active',
    created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    personnel: {
      service_number: '3101050002',
      full_name: 'Anggota Satuan',
      rank: 'Prajurit Satu',
      unit: 'Kompi Senapan A',
      photo: null,
    },
    latitude: -6.15444,
    longitude: 106.853,
    address: 'Kompi Senapan A',
    description: 'Sinyal darurat.',
    status: 'acknowledged',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    personnel: {
      service_number: '3101050003',
      full_name: 'Komandan Satuan 2',
      rank: 'Letnan Kolonel',
      unit: 'Batalyon HQ Central',
      photo: null,
    },
    latitude: -6.79097,
    longitude: 107.64943,
    address: 'Batalyon HQ Central',
    description: 'Sinyal darurat.',
    status: 'resolved',
    created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    personnel: {
      service_number: '3101050001',
      full_name: 'Komandan Batalyon',
      rank: 'Letnan Kolonel',
      unit: 'Batalyon HQ Central',
      photo: null,
    },
    latitude: -6.15444,
    longitude: 106.85318,
    address: 'Batalyon HQ Central',
    description: 'Sinyal darurat (uji coba).',
    status: 'resolved',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function EmergencyAvatar({ event }: { event: EmergencyEvent }) {
  const [failed, setFailed] = useState(false);
  const [start, end] = statusAvatarGradient[event.status];
  if (!isDisplayablePhoto(event.personnel.photo) || failed) {
    return (
      <GradientAvatar
        label={event.personnel.full_name.charAt(0).toUpperCase()}
        gradientStart={start}
        gradientEnd={end}
        size={44}
      />
    );
  }
  return (
    <SecureImage path={event.personnel.photo} style={styles.avatar} onLoadError={() => setFailed(true)} />
  );
}

export default function EmergencyListScreen(props: Props) {
  const { navigation } = props;

  return (
    <MainLayout
      title="Sinyal Darurat"
      subtitle="Riwayat tombol darurat personel"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <FlatList
        data={DUMMY_EMERGENCIES}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada sinyal darurat.</Text>}
        renderItem={({ item }) => (
          <PressableScale
            scaleTo={0.98}
            onPress={() =>
              navigation.navigate(ROUTES.catalogDetail, {
                resource: 'personnel',
                id: item.personnel.service_number,
                initialTab: 'location',
              })
            }>
            <Card style={styles.row}>
              <View style={styles.rowTop}>
                <EmergencyAvatar event={item} />
                <View style={styles.identity}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.personnel.full_name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {joinFields(item.personnel.rank, item.personnel.unit)}
                  </Text>
                </View>
                <Badge label={statusLabel[item.status]} variant={statusBadgeVariant[item.status]} />
              </View>

              <View style={styles.detailRow}>
                <Icon name="map-pin" size={14} color={colors.textMuted} />
                <Text style={styles.detailText} numberOfLines={1}>
                  {item.address ?? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="clock" size={14} color={colors.textMuted} />
                <Text style={styles.detailText} numberOfLines={1}>
                  {formatRelativeTime(item.created_at) ?? '-'} · {formatDateTime(item.created_at) ?? '-'}
                </Text>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.detailLink}>Lihat detail personel</Text>
                <Icon name="chevron-right" size={16} color={colors.primary} />
              </View>
            </Card>
          </PressableScale>
        )}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 96,
    gap: 12,
  },
  empty: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
  row: {
    gap: 8,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: colors.neutralSurface,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  detailLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
