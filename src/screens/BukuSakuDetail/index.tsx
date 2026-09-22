import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import RichTextContent from '@/components/molecules/RichTextContent';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getHandbookArticleApi } from '@/services/api/handbook.service';
import { colors } from '@/theme/colors';
import { tabBarShadow } from '@/theme/shadows';
import type { HandbookArticleDetail } from '@/types';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.bukuSakuDetail>;

// Detail Buku Saku — satu Bab dibaca sebagai E-Book: satu halaman/materi per layar, navigasi
// next/back di antara `chapter.articles`. Isi tiap halaman diambil dari `GET /handbook/articles/{id}`.
// Halaman `record_display` hanya menampilkan penanda (tampilan datanya belum ada di app).
export default function BukuSakuDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { chapter, initialArticleId } = route.params;

  const pages = useMemo(
    () => [...chapter.articles].sort((a, b) => a.page_number - b.page_number),
    [chapter.articles],
  );

  const [index, setIndex] = useState(() => {
    const found = pages.findIndex(p => p.id === initialArticleId);
    return found >= 0 ? found : 0;
  });

  const current = pages[index];

  const [article, setArticle] = useState<HandbookArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const load = useCallback(async () => {
    if (!current) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await getHandbookArticleApi(current.id);
      setArticle(result);
    } catch (error) {
      setArticle(null);
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat halaman.'));
    } finally {
      setIsLoading(false);
    }
  }, [current]);

  useEffect(() => {
    load();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [load]);

  const goTo = (next: number) => {
    if (next < 0 || next >= pages.length) return;
    setIndex(next);
  };

  if (!current) {
    return (
      <MainLayout title={chapter.title} variant="canvas" onBack={() => navigation.goBack()}>
        <View style={styles.centered}>
          <Text style={styles.mutedText}>Bab ini belum memiliki halaman.</Text>
        </View>
      </MainLayout>
    );
  }

  const hasPrev = index > 0;
  const hasNext = index < pages.length - 1;

  return (
    <MainLayout
      title={chapter.title}
      subtitle={`Halaman ${index + 1} dari ${pages.length}`}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}>
        <Text style={styles.pageKicker}>HALAMAN {current.page_number}</Text>
        <Text style={styles.title}>{article?.title ?? current.title}</Text>
        <View style={styles.divider} />

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <Icon name="info" size={22} color={colors.textMuted} />
            <Text style={styles.mutedText}>{errorMessage}</Text>
            <PressableScale contentStyle={styles.retryButton} onPress={load}>
              <Icon name="refresh" size={14} color={colors.primary} />
              <Text style={styles.retryLabel}>Coba lagi</Text>
            </PressableScale>
          </View>
        ) : article?.type === 'record_display' ? (
          <View style={styles.recordCard}>
            <GradientIconChip
              icon="id-card"
              colors={[colors.gradientPersonnelStart, colors.gradientPersonnelEnd]}
              size={44}
              iconSize={20}
              radius={13}
              style={styles.recordIcon}
            />
            <Text style={styles.recordTitle}>Rekam nilai prajurit</Text>
            <Text style={styles.recordMeta}>
              {article.record_type
                ? `Jenis: ${article.record_type}`
                : 'Halaman ini menampilkan data pribadi prajurit.'}
            </Text>
            <Text style={styles.recordNote}>
              Tampilan data untuk halaman ini belum tersedia di aplikasi.
            </Text>
          </View>
        ) : article?.content ? (
          <RichTextContent html={article.content} />
        ) : (
          <Text style={styles.mutedText}>Halaman ini belum memiliki isi.</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PressableScale
          scaleTo={0.96}
          style={styles.navSlot}
          contentStyle={[styles.navButton, styles.navButtonGhost, !hasPrev && styles.navDisabled]}
          disabled={!hasPrev}
          onPress={() => goTo(index - 1)}>
          <Icon
            name="arrow-left"
            size={16}
            color={hasPrev ? colors.primary : colors.placeholder}
          />
          <Text style={[styles.navLabel, styles.navLabelGhost, !hasPrev && styles.navLabelDisabled]}>
            Sebelumnya
          </Text>
        </PressableScale>

        <PressableScale
          scaleTo={0.96}
          style={styles.navSlot}
          contentStyle={[styles.navButton, styles.navButtonPrimary, !hasNext && styles.navDisabled]}
          disabled={!hasNext}
          onPress={() => goTo(index + 1)}>
          <Text style={[styles.navLabel, styles.navLabelPrimary]}>Selanjutnya</Text>
          <Icon name="chevron-right" size={16} color={colors.primaryForeground} />
        </PressableScale>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loader: {
    marginTop: 40,
  },
  pageKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.primary,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.heading,
    lineHeight: 27,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginTop: 14,
    marginBottom: 16,
  },
  mutedText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  stateBox: {
    alignItems: 'center',
    gap: 10,
    marginTop: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    backgroundColor: colors.primaryTintSurface,
  },
  retryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  recordCard: {
    alignItems: 'center',
    gap: 6,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  recordIcon: {
    marginBottom: 4,
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  recordMeta: {
    fontSize: 13,
    color: colors.textBody,
    textAlign: 'center',
  },
  recordNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  navSlot: {
    flex: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 999,
  },
  navButtonGhost: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  navButtonPrimary: {
    backgroundColor: colors.primary,
  },
  navDisabled: {
    opacity: 0.45,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  navLabelGhost: {
    color: colors.primary,
  },
  navLabelPrimary: {
    color: colors.primaryForeground,
  },
  navLabelDisabled: {
    color: colors.placeholder,
  },
});
