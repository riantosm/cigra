import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import GradientButton from '@/components/atoms/GradientButton';
import GradientIconChip from '@/components/atoms/GradientIconChip';
import PressableScale from '@/components/atoms/PressableScale';
import RichTextContent from '@/components/molecules/RichTextContent';
import StatusModal from '@/components/organisms/StatusModal';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AcademyScreen from '@/screens/Academy/shared/AcademyScreen';
import {
  completeAcademyMaterialApi,
  getAcademyMaterialApi,
} from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyMaterial } from '@/types';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.academyMaterial>;

function fileNameFromUrl(url: string | null | undefined): string {
  if (!url) return 'Berkas';
  try {
    const path = url.split('?')[0];
    return decodeURIComponent(path.substring(path.lastIndexOf('/') + 1)) || 'Berkas';
  } catch {
    return 'Berkas';
  }
}

export default function AcademyMaterialScreen(props: Props) {
  const { navigation, route } = props;
  const { componentId, materialId, title } = route.params;

  const [material, setMaterial] = useState<AcademyMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMaterial(await getAcademyMaterialApi(materialId ?? componentId));
    } catch (e) {
      setError(extractErrorMessage(e, 'Data gagal dimuat.'));
    }
    setLoading(false);
  }, [componentId, materialId]);

  useEffect(() => {
    load();
  }, [load]);

  async function markDone() {
    setSubmitting(true);
    try {
      await completeAcademyMaterialApi(componentId);
      setResult({ ok: true, message: 'Materi berhasil ditandai selesai.' });
    } catch (e) {
      setResult({ ok: false, message: extractErrorMessage(e, 'Gagal menandai materi selesai.') });
    }
    setSubmitting(false);
  }

  const heading = material?.title ?? title ?? 'Materi';
  const type = material?.material_type ?? 'text';
  const isCompleted = material?.is_completed;
  const fileUrl = material?.file_url ?? null;
  const externalUrl = material?.external_url ?? null;

  return (
    <AcademyScreen
      title={heading}
      subtitle={
        material?.estimated_minutes ? `Estimasi baca ${material.estimated_minutes} menit` : undefined
      }
      onBack={() => navigation.goBack()}
      loading={loading}
      error={error}
      onRetry={load}
      footer={
        <GradientButton
          label={isCompleted ? 'Sudah Dipelajari' : 'Tandai Sudah Dipelajari'}
          icon={isCompleted ? 'check' : undefined}
          loading={submitting}
          disabled={isCompleted}
          onPress={markDone}
        />
      }>
      {type === 'text' && material?.content ? (
        <RichTextContent html={material.content} />
      ) : material?.content ? (
        <RichTextContent html={material.content} />
      ) : (
        <Text style={styles.body}>
          {type === 'video'
            ? 'Tonton video pada tautan di bawah, lalu tandai selesai.'
            : 'Buka berkas materi di bawah, lalu tandai selesai setelah mempelajarinya.'}
        </Text>
      )}

      {fileUrl ? (
        <PressableScale onPress={() => Linking.openURL(fileUrl)}>
          <View style={styles.fileCard}>
            <GradientIconChip
              icon={type === 'video' ? 'play' : 'file'}
              colors={[colors.gradientPersonnelStart, colors.gradientPersonnelEnd]}
              size={40}
              iconSize={19}
              radius={10}
            />
            <View style={styles.flex}>
              <Text style={styles.fileName} numberOfLines={1}>
                {fileNameFromUrl(fileUrl)}
              </Text>
              <Text style={styles.fileUrl} numberOfLines={1}>
                {fileUrl}
              </Text>
            </View>
            <Text style={styles.linkText}>{type === 'video' ? 'Putar' : 'Buka'}</Text>
          </View>
        </PressableScale>
      ) : null}

      {externalUrl ? (
        <PressableScale onPress={() => Linking.openURL(externalUrl)}>
          <View style={styles.fileCard}>
            <GradientIconChip
              icon="globe"
              colors={[colors.gradientPersonnelStart, colors.gradientPersonnelEnd]}
              size={40}
              iconSize={18}
              radius={10}
            />
            <View style={styles.flex}>
              <Text style={styles.fileName} numberOfLines={1}>
                Tautan Materi
              </Text>
              <Text style={styles.fileUrl} numberOfLines={1}>
                {externalUrl}
              </Text>
            </View>
            <Text style={styles.linkText}>Buka</Text>
          </View>
        </PressableScale>
      ) : null}

      <StatusModal
        visible={!!result}
        variant={result?.ok ? 'success' : 'error'}
        title={result?.ok ? 'Materi Selesai' : 'Gagal'}
        message={result?.message ?? ''}
        primaryAction={{
          label: result?.ok ? 'Kembali ke Program' : 'Tutup',
          onPress: () => {
            const ok = result?.ok;
            setResult(null);
            if (ok) navigation.goBack();
          },
        }}
        onRequestClose={() => setResult(null)}
      />
    </AcademyScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { fontSize: 14, lineHeight: 22, color: colors.textBody },
  linkText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.attachmentRowSurface,
    padding: 14,
    marginTop: 12,
  },
  fileName: { fontSize: 13, fontWeight: '700', color: colors.heading },
  fileUrl: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
