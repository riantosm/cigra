import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import ScreenBackground from '@/components/atoms/ScreenBackground';
import EmptyState from '@/components/molecules/EmptyState';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import HomeHeader from '@/screens/Home/HomeHeader';
import { categoryMeta } from '@/screens/BukuSaku/categoryMeta';
import { BUKU_SAKU_GUIDES } from '@/data/bukuSakuGuides';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { ROUTES } from '@/navigation/paths';
import type { MainTabScreenProps, RootStackParamList } from '@/navigation/types';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import { contentEnterTransition } from '@/utils/motion';

type BukuSakuNavigationProp = CompositeNavigationProp<
  MainTabScreenProps<'BukuSaku'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

export interface BukuSakuScreenProps {
  navigation: BukuSakuNavigationProp;
}

// Tab "Buku Saku" — daftar panduan & ketentuan satuan. Data masih dummy
// (`src/data/bukuSakuGuides.ts`); pencarian client-side atas judul panduan.
export default function BukuSakuScreen(props: BukuSakuScreenProps) {
  const { navigation } = props;
  const user = useAppSelector(state => state.auth.user);
  const bottomPadding = useTabScreenBottomPadding();

  const [query, setQuery] = useState('');

  const guides = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return BUKU_SAKU_GUIDES;
    return BUKU_SAKU_GUIDES.filter(
      guide =>
        guide.title.toLowerCase().includes(keyword) ||
        guide.category.toLowerCase().includes(keyword),
    );
  }, [query]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenBackground />
      <HomeHeader
        user={user}
        onAvatarPress={() => navigation.navigate(ROUTES.profile)}
        onBellPress={() => navigation.navigate(ROUTES.notifications)}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}>
          <Text style={styles.heading}>Buku Saku</Text>
          <Text style={styles.subheading}>Panduan &amp; ketentuan satuan untuk prajurit</Text>

          <SearchFilterBar
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Cari panduan..."
            style={styles.search}
          />

          <Text style={styles.sectionLabel}>DAFTAR PANDUAN</Text>

          {guides.length === 0 ? (
            <EmptyState
              icon="search"
              title="Tidak ditemukan"
              message={`Tidak ada panduan yang cocok dengan "${query.trim()}"`}
            />
          ) : (
            <View style={styles.list}>
              {guides.map(guide => {
                const meta = categoryMeta(guide.category);
                return (
                  <PressableScale
                    key={guide.id}
                    scaleTo={0.98}
                    contentStyle={styles.row}
                    onPress={() =>
                      navigation.navigate(ROUTES.bukuSakuDetail, { id: guide.id })
                    }>
                    <View style={[styles.rowIcon, { backgroundColor: meta.surface }]}>
                      <Icon name={guide.icon} size={20} color={meta.content} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>{guide.title}</Text>
                      <Text style={styles.rowMeta}>
                        {guide.category} · {guide.readMinutes} menit baca
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={18} color={colors.placeholder} />
                  </PressableScale>
                );
              })}
            </View>
          )}
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageGradientStart,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.heading,
  },
  subheading: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  search: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.primary,
    marginBottom: 10,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
    lineHeight: 18,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
