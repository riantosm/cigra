import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';

import GradientButton from '@/components/atoms/GradientButton';
import GradientIconChip from '@/components/atoms/GradientIconChip';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import RichTextContent from '@/components/molecules/RichTextContent';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AbilityPage from '@/screens/BukuSakuDetail/AbilityPage';
import BiodataPage from '@/screens/BukuSakuDetail/BiodataPage';
import TocSheet from '@/screens/BukuSakuDetail/TocSheet';
import { getHandbookArticleApi } from '@/services/api/handbook.service';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { cardShadow, smallButtonShadow, tabBarShadow } from '@/theme/shadows';
import type { HandbookArticleDetail } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import {
  HANDBOOK_PAGE_KICKER,
  abilityHistory,
  handbookPageKind,
  sortedPages,
} from '@/utils/handbook';

type Props = RootStackScreenProps<typeof ROUTES.bukuSakuDetail>;

// Request putus sebelum ada respons (Wi-Fi lemah, pindah jaringan) — `ERR_NETWORK` di axios.
function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

// Satu kali coba ulang otomatis kalau koneksi putus — di jaringan lemah request pertama sering gagal
// padahal server sehat. Error dengan respons (401/404/500) tidak diulang.
async function fetchArticleWithRetry(id: number): Promise<HandbookArticleDetail> {
  try {
    return await getHandbookArticleApi(id);
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return getHandbookArticleApi(id);
  }
}

// Detail Buku Saku — satu Bab dibaca sebagai E-Book: satu halaman per layar, navigasi
// Sebelumnya/Selanjutnya + sheet "Daftar Materi". Isi tiap halaman dari `GET /handbook/articles/{id}`,
// dirender sesuai `record_type`: materi (HTML) / biodata / nilai kemampuan.
export default function BukuSakuDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { chapter, initialArticleId } = route.params;
  const user = useAppSelector(state => state.auth.user);

  const pages = useMemo(() => sortedPages(chapter), [chapter]);

  const [index, setIndex] = useState(() => {
    const found = pages.findIndex(p => p.id === initialArticleId);
    return found >= 0 ? found : 0;
  });
  const [isTocOpen, setIsTocOpen] = useState(false);

  const current = pages[index];

  const [article, setArticle] = useState<HandbookArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // Penanda request terbaru — hasil request lama (pengguna sudah pindah halaman) diabaikan.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!current) return;
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await fetchArticleWithRetry(current.id);
      if (requestId !== requestIdRef.current) return;
      setArticle(result);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setArticle(null);
      setErrorMessage(
        isNetworkError(error)
          ? 'Koneksi ke server terputus. Periksa jaringan, lalu coba lagi.'
          : extractErrorMessage(error, 'Gagal memuat halaman.'),
      );
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
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
      <MainLayout
        title={chapter.title}
        variant="canvas"
        compactTitle
        onBack={() => navigation.goBack()}>
        <View style={styles.centered}>
          <Text style={styles.mutedText}>Bab ini belum memiliki halaman.</Text>
        </View>
      </MainLayout>
    );
  }

  const hasPrev = index > 0;
  const hasNext = index < pages.length - 1;
  // Tepat setelah pindah halaman (sebelum efek fetch jalan) `article` masih milik halaman lama —
  // jangan tampilkan; pakai entri daftar isi sampai halaman yang benar selesai dimuat.
  const shown = !isLoading && article?.id === current.id ? article : null;
  const kind = handbookPageKind(shown ?? current);

  const renderBody = () => {
    if (errorMessage && !isLoading) {
      return (
        <View style={styles.stateBox}>
          <Icon name="info" size={22} color={colors.textMuted} />
          <Text style={styles.mutedText}>{errorMessage}</Text>
          <PressableScale contentStyle={styles.retryButton} onPress={load}>
            <Icon name="refresh" size={14} color={colors.primary} />
            <Text style={styles.retryLabel}>Coba lagi</Text>
          </PressableScale>
        </View>
      );
    }
    if (!shown) return <ActivityIndicator style={styles.loader} color={colors.primary} />;
    if (kind === 'biodata' && shown.biodata) {
      return (
        <BiodataPage
          biodata={shown.biodata}
          personnel={user?.personnel}
          family={user?.family ?? []}
          onOpenFamilyMember={member =>
            navigation.navigate(ROUTES.meFamilyDetail, { id: member.id, name: member.full_name })
          }
        />
      );
    }
    if (kind === 'ability') {
      return <AbilityPage title={shown.title} records={abilityHistory(shown)} />;
    }
    if (kind === 'content') {
      return shown.content ? (
        <RichTextContent html={shown.content} />
      ) : (
        <Text style={styles.mutedText}>Halaman ini belum memiliki isi.</Text>
      );
    }
    // record_type yang belum dikenal app, atau datanya kosong.
    return (
      <View style={styles.recordFallback}>
        <GradientIconChip
          icon="id-card"
          colors={[colors.gradientPersonnelStart, colors.gradientPersonnelEnd]}
          size={44}
          iconSize={20}
          radius={13}
        />
        <Text style={styles.recordFallbackTitle}>Data belum tersedia</Text>
        <Text style={styles.recordFallbackNote}>
          Tampilan untuk halaman ini belum tersedia di aplikasi.
        </Text>
      </View>
    );
  };

  return (
    <MainLayout
      title={chapter.title}
      subtitle={`Halaman ${index + 1} dari ${pages.length}`}
      variant="canvas"
      compactTitle
      onBack={() => navigation.goBack()}
      right={
        <PressableScale
          style={styles.headerAction}
          contentStyle={styles.headerActionContent}
          onPress={() => setIsTocOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Daftar materi">
          <Icon name="list" size={20} color={colors.primary} />
        </PressableScale>
      }>
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.pageCard}>
          <Text style={styles.kicker}>{HANDBOOK_PAGE_KICKER[kind]}</Text>
          <Text style={styles.title}>{shown?.title ?? current.title}</Text>
          <View style={styles.divider} />
          {renderBody()}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PressableScale
          scaleTo={0.96}
          style={styles.navSlot}
          contentStyle={[styles.navButton, styles.navButtonSecondary, !hasPrev && styles.navButtonOff]}
          disabled={!hasPrev}
          onPress={() => goTo(index - 1)}
          accessibilityRole="button"
          accessibilityLabel="Halaman sebelumnya">
          <Icon name="arrow-left" size={18} color={hasPrev ? colors.heading : colors.placeholder} />
          <Text style={[styles.navLabel, !hasPrev && styles.navLabelOff]}>Sebelumnya</Text>
        </PressableScale>

        {hasNext ? (
          <GradientButton
            label="Selanjutnya"
            icon="arrow-right"
            iconPosition="end"
            height={52}
            style={styles.navSlot}
            onPress={() => goTo(index + 1)}
          />
        ) : (
          <View style={[styles.navSlot, styles.navButton, styles.navButtonLast]}>
            <Text style={[styles.navLabel, styles.navLabelOff, styles.navLabelBold]}>Selanjutnya</Text>
            <Icon name="arrow-right" size={18} color={colors.placeholder} />
          </View>
        )}
      </View>

      <TocSheet
        visible={isTocOpen}
        chapterTitle={chapter.title}
        pages={pages}
        currentIndex={index}
        onSelect={next => {
          setIsTocOpen(false);
          goTo(next);
        }}
        onRequestClose={() => setIsTocOpen(false)}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    alignSelf: 'center',
    marginLeft: 12,
  },
  headerActionContent: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...smallButtonShadow,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
  pageCard: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.primary,
  },
  title: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 26,
    color: colors.heading,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginTop: 14,
    marginBottom: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loader: {
    marginVertical: 40,
  },
  mutedText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  stateBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
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
  recordFallback: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  recordFallbackTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  recordFallbackNote: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
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
    height: 52,
    borderRadius: 999,
  },
  navButtonSecondary: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...smallButtonShadow,
  },
  navButtonOff: {
    shadowOpacity: 0,
    elevation: 0,
  },
  navButtonLast: {
    backgroundColor: colors.chipSurface,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.heading,
  },
  navLabelOff: {
    color: colors.placeholder,
  },
  navLabelBold: {
    fontWeight: '700',
  },
});
