import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import GradientAvatar from '@/components/atoms/GradientAvatar';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { categoryMeta } from '@/screens/BukuSaku/categoryMeta';
import { findBukuSakuGuide } from '@/data/bukuSakuGuides';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { BukuSakuAttachment } from '@/types';
import { formatDateShort } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.bukuSakuDetail>;

// Detail panduan Buku Saku — isinya hanya lampiran (tanpa badan artikel), sesuai revisi desain.
// Data masih dummy; tombol "Unduh" belum benar-benar mengunduh (lihat StatusModal di bawah).
export default function BukuSakuDetailScreen(props: Props) {
  const { navigation, route } = props;
  const guide = findBukuSakuGuide(route.params.id);

  const [downloadTarget, setDownloadTarget] = useState<BukuSakuAttachment | null>(null);

  if (!guide) {
    return (
      <MainLayout title="Buku Saku" variant="canvas" onBack={() => navigation.goBack()}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Panduan tidak ditemukan.</Text>
        </View>
      </MainLayout>
    );
  }

  const meta = categoryMeta(guide.category);
  const updatedLabel = formatDateShort(guide.updatedAt);

  return (
    <MainLayout
      title={guide.title}
      subtitle={`${guide.category} · ${guide.readMinutes} menit baca`}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.chips}>
          <View style={[styles.chip, { backgroundColor: meta.surface }]}>
            <Icon name={guide.icon} size={12} color={meta.content} />
            <Text style={[styles.chipLabel, { color: meta.content }]}>{guide.category}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.chipSurface }]}>
            <Icon name="clock" size={12} color={colors.textMuted} />
            <Text style={[styles.chipLabel, styles.chipLabelMuted]}>Diperbarui {updatedLabel}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="paperclip" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Lampiran</Text>
          </View>

          {guide.attachments.map(attachment => (
            <View key={attachment.id} style={styles.attachment}>
              <View style={styles.attachmentIcon}>
                <Icon name="file" size={18} color={colors.primary} />
              </View>
              <View style={styles.attachmentBody}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {attachment.fileName}
                </Text>
                <Text style={styles.attachmentMeta}>
                  {attachment.fileType} • {attachment.fileSize}
                </Text>
              </View>
              <PressableScale
                scaleTo={0.94}
                contentStyle={styles.downloadButton}
                onPress={() => setDownloadTarget(attachment)}
                accessibilityRole="button"
                accessibilityLabel={`Unduh ${attachment.fileName}`}>
                <Icon name="download" size={14} color={colors.primary} />
                <Text style={styles.downloadLabel}>Unduh</Text>
              </PressableScale>
            </View>
          ))}
        </View>

        <View style={styles.author}>
          <GradientAvatar
            label={guide.authorName.charAt(0).toUpperCase()}
            gradientStart={colors.gradientPrimaryStart}
            gradientEnd={colors.gradientPrimaryEnd}
            size={32}
          />
          <View style={styles.authorText}>
            <Text style={styles.authorName}>Disusun oleh {guide.authorName}</Text>
            <Text style={styles.authorMeta}>Terakhir diperbarui {updatedLabel}</Text>
          </View>
        </View>
      </ScrollView>

      <StatusModal
        visible={downloadTarget !== null}
        variant="success"
        icon="download"
        title="Segera Hadir"
        message={
          downloadTarget
            ? `Unduhan "${downloadTarget.fileName}" akan tersedia setelah Buku Saku terhubung ke server.`
            : ''
        }
        primaryAction={{ label: 'Mengerti', onPress: () => setDownloadTarget(null) }}
        onRequestClose={() => setDownloadTarget(null)}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFoundText: { fontSize: 14, color: colors.textMuted },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  chipLabelMuted: {
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    ...cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.attachmentRowSurface,
  },
  attachmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
  },
  attachmentBody: {
    flex: 1,
    gap: 2,
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.heading,
  },
  attachmentMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.primaryTintSurface,
    borderColor: colors.primaryTintBorder,
  },
  downloadLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  authorText: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.heading,
  },
  authorMeta: {
    fontSize: 11,
    color: colors.textFaint,
  },
});
