import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import Button from '@/components/atoms/Button';
import Card from '@/components/molecules/Card';
import MainLayout from '@/components/templates/MainLayout';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);

  return (
    <MainLayout title="Profile">
      <View style={styles.container}>
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}>
          <Card style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLabel}>{(user?.name ?? 'U').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.identity}>
              <Text style={styles.name}>{user?.name ?? '-'}</Text>
              <Text style={styles.username}>@{user?.username ?? '-'}</Text>
            </View>
          </Card>

          <Button label="Logout" variant="danger" style={styles.logout} onPress={() => dispatch(logout())} />
        </MotiView>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 96,
    paddingTop: 24,
  },
  card: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  avatar: {
    height: 80,
    width: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  identity: {
    alignItems: 'center',
    gap: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  username: {
    fontSize: 14,
    color: colors.textMuted,
  },
  logout: {
    marginTop: 24,
  },
});
