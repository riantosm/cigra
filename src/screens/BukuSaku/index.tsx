import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { handbookIcon } from '@/screens/BukuSaku/chapterIcon';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { ROUTES } from '@/navigation/paths';
import type { MainTabScreenProps, RootStackParamList } from '@/navigation/types';
import { getHandbookChaptersApi } from '@/services/api/handbook.service';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { HandbookChapter } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { contentEnterTransition } from '@/utils/motion';

type BukuSakuNavigationProp = CompositeNavigationProp<
  MainTabScreenProps<'BukuSaku'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

export interface BukuSakuScreenProps {
  navigation: BukuSakuNavigationProp;
}

// Tab "Buku Saku" — daftar isi E-Book: daftar Bab dari `GET /handbook/chapters`. Ketuk sebuah
// Bab untuk membuka halaman-halamannya (navigasi next/back di `BukuSakuDetail`). Pencarian
// client-side atas judul Bab & judul halaman di dalamnya.
export default function BukuSakuScreen(props: BukuSakuScreenProps) {
  const { navigation } = props;
  const user = useAppSelector(state => state.auth.user);
  const bottomPadding = useTabScreenBottomPadding();

  const [query, setQuery] = useState('');
  const [chapters, setChapters] = useState<HandbookChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const result = await getHandbookChaptersApi();
      setChapters([...result].sort((a, b) => a.sort_order - b.sort_order));
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat Buku Saku.'));
      setChapters([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return chapters;
    return chapters.filter(
      chapter =>
        chapter.title.toLowerCase().includes(keyword) ||
        chapter.articles.some(article => article.title.toLowerCase().includes(keyword)),
    );
  }, [query, chapters]);

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
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => load('refresh')}
            tintColor={colors.primary}
          />
        }>
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}>
          <Text style={styles.heading}>Buku Saku</Text>
          <Text style={styles.subheading}>Pedoman &amp; materi satuan untuk prajurit</Text>

          <SearchFilterBar
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Cari bab atau materi..."
            style={styles.search}
          />

          <Text style={styles.sectionLabel}>DAFTAR BAB</Text>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : errorMessage ? (
            <EmptyState icon="info" title="Gagal memuat" message={errorMessage} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={query.trim() ? 'search' : 'handbook'}
              title={query.trim() ? 'Tidak ditemukan' : 'Belum ada materi'}
              message={
                query.trim()
                  ? `Tidak ada bab atau materi yang cocok dengan "${query.trim()}"`
                  : 'Buku Saku untuk satuan ini belum tersedia.'
              }
            />
          ) : (
            <View style={styles.list}>
              {filtered.map(chapter => (
                <PressableScale
                  key={chapter.id}
                  scaleTo={0.98}
                  contentStyle={styles.row}
                  onPress={() =>
                    navigation.navigate(ROUTES.bukuSakuDetail, { chapter })
                  }>
                  <View style={styles.rowIcon}>
                    <Icon name={handbookIcon(chapter.icon)} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{chapter.title}</Text>
                    <Text style={styles.rowMeta}>
                      {chapter.articles_count || chapter.articles.length} halaman
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} color={colors.placeholder} />
                </PressableScale>
              ))}
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
  loader: {
    marginTop: 32,
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
    backgroundColor: colors.chipSurface,
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
