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

import Badge from '@/components/atoms/Badge';
import GradientIconChip from '@/components/atoms/GradientIconChip';
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
import type { HandbookArticleRef, HandbookChapter } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { HANDBOOK_PAGE_META, chapterHasRecords, handbookPageKind, sortedPages } from '@/utils/handbook';
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
// client-side atas judul Bab & judul halaman; halaman yang cocok tampil di bawah babnya dan
// langsung membuka halaman itu (`initialArticleId`).
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

  const keyword = query.trim().toLowerCase();

  const results = useMemo<ChapterResult[]>(() => {
    if (!keyword) return chapters.map(chapter => ({ chapter, matches: [] }));
    return chapters
      .map(chapter => ({
        chapter,
        matches: sortedPages(chapter).filter(page => page.title.toLowerCase().includes(keyword)),
      }))
      .filter(({ chapter, matches }) => matches.length > 0 || chapter.title.toLowerCase().includes(keyword));
  }, [keyword, chapters]);

  const matchedPageCount = results.reduce((sum, result) => sum + result.matches.length, 0);

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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{keyword ? 'HASIL PENCARIAN' : 'DAFTAR BAB'}</Text>
            {keyword && results.length > 0 ? (
              <Text style={styles.sectionCount}>
                {results.length} bab
                {matchedPageCount > 0 ? ` · ${matchedPageCount} halaman` : ''}
              </Text>
            ) : null}
          </View>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : errorMessage ? (
            <EmptyState icon="info" title="Gagal memuat" message={errorMessage} />
          ) : results.length === 0 ? (
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
              {results.map(({ chapter, matches }) => (
                <View key={chapter.id} style={styles.card}>
                  <PressableScale
                    scaleTo={0.98}
                    contentStyle={styles.row}
                    onPress={() => navigation.navigate(ROUTES.bukuSakuDetail, { chapter })}
                    accessibilityRole="button"
                    accessibilityLabel={`Buka ${chapter.title}`}>
                    <GradientIconChip
                      icon={handbookIcon(chapter.icon)}
                      colors={[colors.gradientPersonnelStart, colors.gradientPersonnelEnd]}
                      size={42}
                      iconSize={20}
                      radius={13}
                    />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>{chapter.title}</Text>
                      <View style={styles.rowMetaLine}>
                        <Text style={styles.rowMeta}>
                          {chapter.articles_count || chapter.articles.length} halaman
                        </Text>
                        {chapterHasRecords(chapter) ? (
                          <Badge label="Data pribadi" variant="primary" icon="profile" style={styles.recordBadge} />
                        ) : null}
                      </View>
                    </View>
                    <Icon name="chevron-right" size={18} color={colors.placeholder} />
                  </PressableScale>

                  {matches.length > 0 ? (
                    <View style={styles.matchList}>
                      {matches.map(page => (
                        <PressableScale
                          key={page.id}
                          scaleTo={0.98}
                          contentStyle={styles.matchRow}
                          onPress={() =>
                            navigation.navigate(ROUTES.bukuSakuDetail, {
                              chapter,
                              initialArticleId: page.id,
                            })
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Buka halaman ${page.title}`}>
                          <View style={styles.matchNumber}>
                            <Text style={styles.matchNumberText}>{pageIndexOf(chapter, page) + 1}</Text>
                          </View>
                          <View style={styles.rowBody}>
                            <HighlightedTitle title={page.title} keyword={keyword} />
                            <Text style={styles.matchMeta}>{HANDBOOK_PAGE_META[handbookPageKind(page)]}</Text>
                          </View>
                          <Icon name="chevron-right" size={16} color={colors.placeholder} />
                        </PressableScale>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ChapterResult {
  chapter: HandbookChapter;
  // Halaman yang judulnya cocok dengan kata kunci (kosong kalau tidak sedang mencari).
  matches: HandbookArticleRef[];
}

// Nomor halaman di dalam bab = urutan di daftar isi (sama dengan "Halaman X dari N" di detail).
function pageIndexOf(chapter: HandbookChapter, page: HandbookArticleRef): number {
  return sortedPages(chapter).findIndex(item => item.id === page.id);
}

// Judul halaman dengan bagian yang cocok diberi latar biru muda.
function HighlightedTitle(props: { title: string; keyword: string }) {
  const { title, keyword } = props;
  const at = title.toLowerCase().indexOf(keyword);
  if (!keyword || at < 0) {
    return (
      <Text style={styles.matchTitle} numberOfLines={1}>
        {title}
      </Text>
    );
  }
  return (
    <Text style={styles.matchTitle} numberOfLines={1}>
      {title.slice(0, at)}
      <Text style={styles.matchHighlight}>{title.slice(at, at + keyword.length)}</Text>
      {title.slice(at + keyword.length)}
    </Text>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.primary,
  },
  sectionCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  loader: {
    marginTop: 32,
  },
  list: {
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...cardShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
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
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  recordBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  matchList: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.attachmentRowSurface,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  matchNumber: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  matchNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  matchTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.heading,
  },
  matchHighlight: {
    backgroundColor: colors.primarySurface,
  },
  matchMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
