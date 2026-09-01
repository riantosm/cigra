import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import type { BadgeVariant } from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import TextField from '@/components/atoms/TextField';
import Card from '@/components/molecules/Card';
import OpenMapsButton from '@/components/molecules/OpenMapsButton';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getPanicButtonApi, updatePanicButtonApi } from '@/services/api/panicButton.service';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import type { PanicButtonDetail } from '@/types';
import { isDisplayablePhoto } from '@/utils/avatar';
import { extractErrorMessage, formatDateTime, formatRelativeTime, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.emergencyDetail>;

const COMMANDER_ROLE = 'komandan';

const emergencyStatusLabel: Record<string, string> = {
  active: 'Aktif',
  acknowledged: 'Ditangani',
  resolved: 'Selesai',
};

const emergencyStatusBadgeVariant: Record<string, BadgeVariant> = {
  active: 'danger',
  acknowledged: 'warning',
  resolved: 'success',
};

function handledByName(handledBy: PanicButtonDetail['handled_by']): string | null {
  if (!handledBy) return null;
  return typeof handledBy === 'string' ? handledBy : handledBy.name;
}

export default function EmergencyDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { id } = route.params;
  const roles = useAppSelector(state => state.auth.user?.roles ?? []);
  const canManage = roles.includes(COMMANDER_ROLE);

  const [detail, setDetail] = useState<PanicButtonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<{ variant: 'success' | 'error'; title: string; message: string } | null>(
    null,
  );
  const keyboardHeight = useKeyboardHeight();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      setErrorMessage(null);
      try {
        setDetail(await getPanicButtonApi(id));
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat detail sinyal darurat.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  async function updateStatus(status: 'acknowledged' | 'resolved') {
    setIsSubmitting(true);
    try {
      await updatePanicButtonApi(id, {
        status,
        ...(status === 'resolved' && note.trim() ? { note: note.trim() } : null),
      });
      // Ambil ulang detail lengkap — response PATCH tidak selalu mengembalikan bentuk penuh
      // (mis. tanpa `personnel`/`timeline`), yang sebelumnya bikin render crash.
      try {
        setDetail(await getPanicButtonApi(id));
      } catch {
        // Refresh gagal bukan berarti update gagal — biarkan data lama, status modal tetap sukses.
      }
      setNote('');
      setModal({
        variant: 'success',
        title: status === 'acknowledged' ? 'Ditandai Ditangani' : 'Ditandai Selesai',
        message: 'Status sinyal darurat berhasil diperbarui.',
      });
    } catch (error) {
      setModal({
        variant: 'error',
        title: 'Gagal Memperbarui',
        message: extractErrorMessage(error, 'Status sinyal darurat gagal diperbarui.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const status = detail?.status ?? '';
  const showAcknowledge = canManage && status === 'active';
  const showResolve = canManage && (status === 'active' || status === 'acknowledged');
  const hasCoords = typeof detail?.latitude === 'number' && typeof detail?.longitude === 'number';

  return (
    <MainLayout
      title="Detail Sinyal Darurat"
      subtitle={detail ? `#${detail.id}` : undefined}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : !detail ? (
        <Text style={styles.empty}>{errorMessage ?? 'Data tidak ditemukan.'}</Text>
      ) : (
        <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
          }>
          <Card style={styles.card}>
            <View style={styles.identityRow}>
              {isDisplayablePhoto(detail.personnel?.photo) ? (
                <SecureImage path={detail.personnel?.photo ?? null} style={styles.avatar} />
              ) : (
                <GradientAvatar
                  label={(detail.personnel?.full_name ?? '?').charAt(0).toUpperCase()}
                  gradientStart={colors.gradientDangerStart}
                  gradientEnd={colors.danger}
                  size={48}
                />
              )}
              <View style={styles.identity}>
                <Text style={styles.name} numberOfLines={1}>
                  {detail.personnel?.full_name ?? 'Personel tidak diketahui'}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {joinFields(detail.personnel?.rank, detail.personnel?.unit) || '-'}
                </Text>
              </View>
              <Badge
                label={emergencyStatusLabel[status] ?? status}
                variant={emergencyStatusBadgeVariant[status] ?? 'neutral'}
              />
            </View>

            {detail.personnel?.service_number ? (
              <PressableScale
                onPress={() =>
                  navigation.navigate(ROUTES.catalogDetail, {
                    resource: 'personnel',
                    id: detail.personnel.service_number,
                    initialTab: 'location',
                  })
                }
                contentStyle={styles.linkRow}>
                <Text style={styles.linkText}>Lihat detail personel</Text>
                <Icon name="chevron-right" size={16} color={colors.primary} />
              </PressableScale>
            ) : null}
          </Card>

          <Card style={styles.card}>
            <InfoRow icon="clock" label="Waktu" value={`${formatDateTime(detail.created_at) ?? '-'} (${formatRelativeTime(detail.created_at) ?? '-'})`} />
            {hasCoords ? (
              <InfoRow
                icon="map-pin"
                label="Lokasi"
                value={detail.address ?? `${detail.latitude.toFixed(5)}, ${detail.longitude.toFixed(5)}`}
              />
            ) : detail.address ? (
              <InfoRow icon="map-pin" label="Lokasi" value={detail.address} />
            ) : null}
            {detail.accuracy != null ? (
              <InfoRow icon="crosshair" label="Akurasi" value={`±${Math.round(detail.accuracy)} m`} />
            ) : null}
            {detail.description ? (
              <InfoRow icon="info" label="Keterangan" value={detail.description} />
            ) : null}
            {handledByName(detail.handled_by) ? (
              <InfoRow icon="shield-check" label="Ditangani oleh" value={handledByName(detail.handled_by) as string} />
            ) : null}
            {hasCoords ? (
              <OpenMapsButton latitude={detail.latitude} longitude={detail.longitude} style={styles.mapsButton} />
            ) : null}
          </Card>

          {detail.timeline?.length ? (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Kronologi</Text>
              {detail.timeline.map((entry, index) => (
                <View key={`${entry.event}-${index}`} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineEvent}>{entry.event}</Text>
                    <Text style={styles.timelineMeta}>
                      {joinFields(entry.actor, formatDateTime(entry.at) ?? undefined)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          ) : null}

          {showResolve ? (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Perbarui Status</Text>
              <TextField
                placeholder="Catatan penanganan (opsional, untuk 'Selesai')"
                value={note}
                onChangeText={setNote}
                multiline
                style={styles.noteInput}
                onFocus={() => {
                  // Kartu ini item terakhir di ScrollView — geser ke bawah supaya field + tombol
                  // benar-benar di atas keyboard, bukan cuma tidak terpotong.
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
                }}
              />
              {showAcknowledge ? (
                <GradientButton
                  label="Tandai Ditangani"
                  onPress={() => updateStatus('acknowledged')}
                  loading={isSubmitting}
                  style={styles.actionButton}
                />
              ) : null}
              <GradientButton
                label="Tandai Selesai"
                tone="danger"
                onPress={() => updateStatus('resolved')}
                loading={isSubmitting}
                style={styles.actionButton}
              />
            </Card>
          ) : null}
        </ScrollView>
        </View>
      )}

      <StatusModal
        visible={modal !== null}
        variant={modal?.variant ?? 'success'}
        title={modal?.title ?? ''}
        message={modal?.message ?? ''}
        onRequestClose={() => setModal(null)}
        primaryAction={{ label: 'Tutup', onPress: () => setModal(null) }}
      />
    </MainLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={16} color={colors.textMuted} />
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loader: {
    marginTop: 48,
  },
  empty: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 96,
    gap: 14,
  },
  card: {
    gap: 14,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: colors.neutralSurface,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.heading,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoBody: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  mapsButton: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timelineDot: {
    marginTop: 5,
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  timelineBody: {
    flex: 1,
    gap: 2,
  },
  timelineEvent: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  timelineMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  noteInput: {
    minHeight: 72,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  actionButton: {
    marginTop: 4,
  },
});
