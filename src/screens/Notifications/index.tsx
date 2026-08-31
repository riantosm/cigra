import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppSelector } from '@/store/hooks';
import type { LocalAnnouncement } from '@/store/slices/announcementSlice';
import { colors } from '@/theme/colors';
import { formatRelativeTime } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.notifications>;

type NotificationType = 'emergency' | 'announcement' | 'info' | 'system';

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

const typeIcon: Record<NotificationType, IconName> = {
  emergency: 'emergency',
  announcement: 'megaphone',
  info: 'info',
  system: 'settings',
};

const typeColor: Record<NotificationType, string> = {
  emergency: colors.danger,
  announcement: colors.warning,
  info: colors.primary,
  system: colors.textMuted,
};

const typeSurface: Record<NotificationType, string> = {
  emergency: colors.dangerSurface,
  announcement: colors.chipSurface,
  info: colors.primarySurface,
  system: colors.chipSurface,
};

// Dummy sementara — belum ada endpoint `GET /notifications` (lihat API_CONTRACT.md). Bentuk field
// di sini (type/title/body/created_at/read) sengaja disamakan dengan draf kontrak itu supaya
// tinggal ganti sumber datanya begitu API tersedia.
const DUMMY_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    type: 'emergency',
    title: 'Sinyal Darurat Baru',
    body: 'Praka Rizky Maulana menekan tombol darurat di Pos Timur.',
    created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: '2',
    type: 'announcement',
    title: 'Apel Pagi',
    body: 'Apel pagi besok pukul 06.00 di Lapangan Utama. Seluruh personel wajib hadir.',
    created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: 'Perawatan Kendaraan',
    body: 'Jadwal perawatan rutin kendaraan dinas telah diperbarui.',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: '4',
    type: 'system',
    title: 'Pelacakan Lokasi Aktif',
    body: 'Layanan pelacakan lokasi latar belakang berjalan normal.',
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: '5',
    type: 'announcement',
    title: 'Perubahan Jadwal Piket',
    body: 'Jadwal piket minggu ini mengalami penyesuaian. Cek menu Jadwal Piket.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

// Pengumuman yang dikirim komandan (redux, lihat SendAnnouncement) ikut muncul di daftar
// notifikasi — dianggap belum dibaca dan selalu di urutan paling atas berdasar waktu.
function announcementToNotification(announcement: LocalAnnouncement): AppNotification {
  return {
    id: `ann-${announcement.id}`,
    type: announcement.type === 'info' ? 'info' : 'announcement',
    title: announcement.title,
    body: announcement.body,
    created_at: announcement.created_at,
    read: false,
  };
}

export default function NotificationsScreen(props: Props) {
  const { navigation } = props;
  const sentAnnouncements = useAppSelector(state => state.announcements.sent);

  const notifications = useMemo(() => {
    const merged = [...sentAnnouncements.map(announcementToNotification), ...DUMMY_NOTIFICATIONS];
    return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sentAnnouncements]);

  return (
    <MainLayout
      title="Notifikasi"
      subtitle="Pemberitahuan & pengumuman"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada notifikasi.</Text>}
        renderItem={({ item }) => (
          <PressableScale
            scaleTo={0.98}
            onPress={() => {
              if (item.type === 'emergency') navigation.navigate(ROUTES.emergencyList);
            }}>
            <Card style={[styles.row, !item.read && styles.rowUnread]}>
              <View style={[styles.iconCircle, { backgroundColor: typeSurface[item.type] }]}>
                <Icon name={typeIcon[item.type]} size={18} color={typeColor[item.type]} />
              </View>
              <View style={styles.textGroup}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.time}>{formatRelativeTime(item.created_at) ?? '-'}</Text>
              </View>
              {!item.read ? <View style={styles.unreadDot} /> : null}
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
    paddingTop: 20,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowUnread: {
    borderColor: colors.notifUnreadBorder,
    backgroundColor: colors.notifUnreadSurface,
  },
  iconCircle: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  body: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  unreadDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
});
