import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { logo } from '@/assets';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import type { AuthUser } from '@/types';
import { isDisplayablePhoto } from '@/utils/avatar';

// Notifikasi dummy bawaan yang berstatus belum dibaca (lihat screens/Notifications) — dijumlahkan
// dengan pengumuman yang dikirim komandan untuk angka badge lonceng.
const BASE_UNREAD_NOTIFICATIONS = 2;

export interface HomeHeaderProps {
  user: AuthUser | null;
  onAvatarPress: () => void;
  onBellPress?: () => void;
}

function greetingForHour(hour: number): string {
  if (hour < 11) return 'pagi';
  if (hour < 15) return 'siang';
  if (hour < 18) return 'sore';
  return 'malam';
}

// Header dashboard Home — dipakai oleh SEMUA role (CommanderHome & MemberHome) supaya identitas
// visual di layar utama konsisten, bukan cuma khusus komandan.
export default function HomeHeader(props: HomeHeaderProps) {
  const { user, onAvatarPress, onBellPress } = props;
  const [photoFailed, setPhotoFailed] = useState(false);
  const sentAnnouncementCount = useAppSelector(state => state.announcements.sent.length);
  const unreadCount = BASE_UNREAD_NOTIFICATIONS + sentAnnouncementCount;
  const personnel = user?.personnel;
  const displayName = personnel ? [personnel.rank, personnel.full_name].filter(Boolean).join(' ') : (user?.name ?? '-');
  const unitLabel = personnel?.current_assignment?.unit ?? '-';
  const roleLabel = user?.roles?.[0] ? user.roles[0].charAt(0).toUpperCase() + user.roles[0].slice(1) : 'Prajurit';
  const photoPath = personnel?.photo;

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.badge}>
          <Image source={logo.LogoIcon} style={styles.badgeImage} resizeMode="contain" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.greeting} numberOfLines={1}>
            Selamat {greetingForHour(new Date().getHours())}, {roleLabel}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.unit} numberOfLines={1}>
            {unitLabel}
          </Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <PressableScale
          onPress={onBellPress}
          disabled={!onBellPress}
          contentStyle={styles.bellButton}
          accessibilityRole="button"
          accessibilityLabel="Notifikasi">
          <Icon name="bell" size={20} color={colors.text} />
          {unreadCount > 0 ? (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeLabel}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </PressableScale>
        <PressableScale onPress={onAvatarPress}>
          {isDisplayablePhoto(photoPath) && !photoFailed ? (
            <SecureImage
              path={photoPath}
              style={styles.avatarImage}
              onLoadError={() => setPhotoFailed(true)}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackLabel}>{(user?.name ?? 'U').charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    height: 44,
    width: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
  },
  badgeImage: {
    width: '100%',
    height: '100%',
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  greeting: {
    fontSize: 12,
    color: colors.textMuted,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  unit: {
    fontSize: 12,
    color: colors.textMuted,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralSurface,
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 4,
    height: 16,
    width: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  bellBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.dangerForeground,
  },
  avatarImage: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: colors.neutralSurface,
  },
  avatarFallback: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarFallbackLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
});
