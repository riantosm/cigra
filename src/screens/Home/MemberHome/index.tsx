import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import MenuCard from '@/components/molecules/MenuCard';
import HomeHeader from '@/screens/Home/HomeHeader';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { ROUTES } from '@/navigation/paths';
import type { CatalogResourceKey, MainTabScreenProps, RootStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { catalogResourceConfigs } from '@/utils/catalogResources';
import { contentEnterTransition } from '@/utils/motion';
import type { AuthUser } from '@/types';

export type MemberHomeNavigationProp = CompositeNavigationProp<
  MainTabScreenProps<'Home'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

export interface MemberHomeProps {
  user: AuthUser | null;
  navigation: MemberHomeNavigationProp;
  isRefreshing: boolean;
  onRefresh: () => void;
}

const catalogMenuOrder: CatalogResourceKey[] = [
  'personnel',
  'persit',
  'vehicles',
  'weapon-categories',
  'weapon-assignments',
];

export default function MemberHome(props: MemberHomeProps) {
  const { user, navigation, isRefreshing, onRefresh } = props;
  const bottomPadding = useTabScreenBottomPadding();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <HomeHeader user={user} onAvatarPress={() => navigation.navigate(ROUTES.profile)} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={contentEnterTransition}
          style={styles.content}>
          <Text style={styles.title}>Welcome, {user?.name ?? 'User'} 👋</Text>
          <Text style={styles.subtitle}>Selamat datang di Smart Battalion</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}
          style={styles.grid}>
          {catalogMenuOrder.map(resource => {
            const config = catalogResourceConfigs[resource];
            return (
              <View key={resource} style={styles.gridItem}>
                <MenuCard
                  icon={config.icon}
                  title={config.menuTitle}
                  subtitle={config.menuSubtitle}
                  gradientStart={config.gradientStart}
                  gradientEnd={config.gradientEnd}
                  onPress={() => navigation.navigate(ROUTES.catalogList, { resource })}
                />
              </View>
            );
          })}
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    backgroundColor: colors.surface,
  },
  content: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    width: '47%',
  },
});
