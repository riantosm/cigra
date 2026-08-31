import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MotiView } from 'moti';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import Badge from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import Icon from '@/components/atoms/Icon';
import SecureImage from '@/components/atoms/SecureImage';
import Card from '@/components/molecules/Card';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { cardShadowRaised } from '@/theme/shadows';
import { isDisplayablePhoto } from '@/utils/avatar';
import { catalogResourceConfigs } from '@/utils/catalogResources';
import { extractErrorMessage } from '@/utils/format';
import { contentEnterTransition } from '@/utils/motion';

type Props = RootStackScreenProps<'CatalogDetail'>;

export default function CatalogDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { resource, id, initialTab } = route.params;
  const config = catalogResourceConfigs[resource];

  const [detail, setDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await config.fetchDetail(id);
      setDetail(result);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat detail.'));
    } finally {
      setIsLoading(false);
    }
  }, [config, id]);

  useEffect(() => {
    load();
  }, [load]);

  // Terpisah dari `load`: dipakai buat pull-to-refresh (lihat PersonnelTabs), jadi gagalnya
  // tidak memicu StatusModal error yang mem-blok layar — konten lama tetap tampil, best-effort.
  const handleRefresh = useCallback(async () => {
    try {
      const result = await config.fetchDetail(id);
      setDetail(result);
    } catch {
      // best-effort
    }
  }, [config, id]);

  const header = detail ? config.detailHeader(detail) : null;

  const headerCard = header ? (
    <Card style={styles.headerCard}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="headerGlow" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={config.gradientEnd} stopOpacity={0.14} />
            <Stop offset="0.62" stopColor={config.gradientEnd} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#headerGlow)" />
      </Svg>
      <View style={styles.headerRow}>
        {isDisplayablePhoto(header.photo) && !photoFailed ? (
          <SecureImage
            path={header.photo}
            style={styles.avatarImage}
            onLoadError={() => setPhotoFailed(true)}
          />
        ) : (
          <GradientAvatar
            label={header.title.charAt(0).toUpperCase()}
            gradientStart={config.gradientStart}
            gradientEnd={config.gradientEnd}
            size={88}
            style={styles.headerAvatar}
          />
        )}
        <View style={styles.headerText}>
          <Text style={styles.title}>{header.title}</Text>
          <Badge label={header.badgeLabel} variant={header.badgeVariant} />
          <View style={styles.metaRows}>
            {header.metaRows.map(meta => (
              <View key={meta.icon + meta.text} style={styles.metaRow}>
                <Icon name={meta.icon} size={15} color={colors.primary} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {meta.text}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Card>
  ) : null;

  return (
    <MainLayout
      title={config.screenTitle}
      subtitle={`Detail ${config.screenTitle.toLowerCase()}`}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.centerState} color={colors.primary} />
      ) : detail && headerCard ? (
        config.tabbedDetail ? (
          // PersonnelTabs' collapsing-header tab container owns the header card itself (so it
          // can scroll away with the content and let the tab bar stick below the nav bar) —
          // that's why this branch hands the header down as a render prop instead of rendering
          // it here, unlike the plain ScrollView branch below.
          <View style={styles.tabbedContent}>
            {config.renderDetail(
              detail,
              <MotiView
                style={styles.tabbedHeaderWrap}
                from={{ opacity: 0, translateY: 16 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={contentEnterTransition}
              >
                {headerCard}
              </MotiView>,
              handleRefresh,
              initialTab,
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={contentEnterTransition}
            >
              {headerCard}
              {config.renderDetail(detail)}
            </MotiView>
          </ScrollView>
        )
      ) : null}

      <StatusModal
        visible={!!errorMessage}
        variant="error"
        title="Gagal Memuat"
        message={errorMessage ?? ''}
        onRequestClose={() => navigation.goBack()}
        primaryAction={{ label: 'Coba Lagi', onPress: load }}
        secondaryAction={{
          label: 'Kembali',
          onPress: () => navigation.goBack(),
        }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  centerState: {
    marginTop: 32,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 96,
  },
  tabbedContent: {
    flex: 1,
    // The collapsing header inside Tabs.Container translates upward past its own top edge as it
    // scrolls away — without clipping here, that negative-translated content isn't confined to this
    // box and paints over MainLayout's NavBar above it (RN doesn't clip overflowing children by
    // default; it just draws them in tree order, on top of whatever's behind).
    overflow: 'hidden',
  },
  tabbedHeaderWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerCard: {
    overflow: 'hidden',
    paddingVertical: 24,
    ...cardShadowRaised,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatarImage: {
    height: 88,
    width: 88,
    borderRadius: 44,
    backgroundColor: colors.neutralSurface,
  },
  headerAvatar: {
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.heading,
  },
  metaRows: {
    marginTop: 4,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.heading,
  },
});
