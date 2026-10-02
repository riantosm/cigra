import { Image, StyleSheet, Text, View } from 'react-native';

import { logo } from '@/assets';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { headerShadow } from '@/theme/shadows';
import type { AuthUser } from '@/types';
import { cleanValue, greetingForHour, titleCase } from '@/utils/format';

export interface HomeHeaderProps {
  user: AuthUser | null;
  onBellPress?: () => void;
}

// Header dashboard Home — dipakai oleh SEMUA role (CommanderHome & MemberHome) supaya identitas
// visual di layar utama konsisten, bukan cuma khusus komandan. Tidak ada avatar → Profile di sini:
// Profile sekarang tab ke-5 di bar bawah, ikonnya foto user (lihat CustomTabBar).
export default function HomeHeader(props: HomeHeaderProps) {
  const { user, onBellPress } = props;
  const unreadCount = useAppSelector(state => state.notifications.unreadTotal);
  const personnel = user?.personnel;
  const displayName = personnel
    ? [cleanValue(personnel.rank), cleanValue(personnel.full_name)].filter(Boolean).join(' ') || (user?.name ?? '-')
    : (user?.name ?? '-');
  const unitLabel = cleanValue(personnel?.current_assignment?.unit) ?? '-';
  const roleLabel = titleCase(user?.roles?.[0]) ?? 'Prajurit';

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image source={logo.LogoIcon} style={styles.badgeImage} resizeMode="contain" />
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
    backgroundColor: colors.headerSurface,
    ...headerShadow,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeImage: {
    width: 44,
    height: 44,
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
    color: colors.heading,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
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
});
