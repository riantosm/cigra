import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import Badge from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import Card from '@/components/molecules/Card';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { catalogResourceConfigs } from '@/utils/catalogResources';
import { extractErrorMessage } from '@/utils/format';
import { contentEnterTransition } from '@/utils/motion';

type Props = RootStackScreenProps<'CatalogDetail'>;

export default function CatalogDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { resource, id } = route.params;
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

  const header = detail ? config.detailHeader(detail) : null;

  return (
    <MainLayout title={config.screenTitle} onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.centerState} color={colors.primary} />
      ) : detail && header ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={contentEnterTransition}>
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                {header.photo && !photoFailed ? (
                  <Image source={{ uri: header.photo }} style={styles.avatarImage} onError={() => setPhotoFailed(true)} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLabel}>{header.title.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.headerText}>
                  <Text style={styles.title}>{header.title}</Text>
                  <Badge label={header.badgeLabel} variant={header.badgeVariant} />
                  <View style={styles.metaRows}>
                    {header.metaRows.map(meta => (
                      <View key={meta.icon + meta.text} style={styles.metaRow}>
                        <Icon name={meta.icon} size={14} color={colors.textMuted} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {meta.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </Card>

            {config.renderDetail(detail)}
          </MotiView>
        </ScrollView>
      ) : null}

      <StatusModal
        visible={!!errorMessage}
        variant="error"
        title="Gagal Memuat"
        message={errorMessage ?? ''}
        onRequestClose={() => navigation.goBack()}
        primaryAction={{ label: 'Coba Lagi', onPress: load }}
        secondaryAction={{ label: 'Kembali', onPress: () => navigation.goBack() }}
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
    paddingTop: 20,
    paddingBottom: 96,
  },
  headerCard: {
    paddingVertical: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatar: {
    height: 72,
    width: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarImage: {
    height: 72,
    width: 72,
    borderRadius: 36,
    backgroundColor: colors.neutralSurface,
  },
  avatarLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  metaRows: {
    marginTop: 4,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
});
