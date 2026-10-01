import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import EmptyState from '@/components/molecules/EmptyState';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { endCoopJuyarApi, getCoopJuyarsApi } from '@/services/api/coopSalary.service';
import { colors } from '@/theme/colors';
import { cardShadow, tabBarShadow } from '@/theme/shadows';
import type { CoopJuyar } from '@/types';
import { cleanValue, extractErrorMessage, formatDateShort, joinFields } from '@/utils/format';
import { initialsOf } from '@/utils/rollCall';

type Props = RootStackScreenProps<typeof ROUTES.coopJuyars>;

type Modal =
  | { kind: 'confirm-end'; juyar: CoopJuyar }
  | { kind: 'result'; variant: 'success' | 'error'; title: string; message: string }
  | null;

// Penunjukan Juyar — pengelola Tagihan Satuan (`GET /coop-salary-report/juyars`). Dibuka dari ikon
// di header menu Tagihan Koperasi (hanya bila `capabilities.can_manage_reports`). Tidak ada
// aktif/nonaktif sementara: hanya tunjuk (layar CoopJuyarAppoint) dan akhiri (`POST .../end`).
// Respons tidak membawa pangkat, jadi di bawah nama tampil NRP.
export default function CoopJuyarsScreen(props: Props) {
  const { navigation } = props;

  const [juyars, setJuyars] = useState<CoopJuyar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<number | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);
    try {
      setJuyars(await getCoopJuyarsApi());
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat daftar Juyar.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Muat ulang tiap layar kembali fokus (mis. sesudah menunjuk Juyar baru).
  useFocusEffect(
    useCallback(() => {
      load(isFirstFocus.current ? 'initial' : 'refresh');
      isFirstFocus.current = false;
    }, [load]),
  );

  async function handleEnd(juyar: CoopJuyar) {
    setModal(null);
    setEndingId(juyar.id);
    try {
      const message = await endCoopJuyarApi(juyar.id);
      setModal({ kind: 'result', variant: 'success', title: 'Penugasan Diakhiri', message });
      load('refresh');
    } catch (error) {
      setModal({
        kind: 'result',
        variant: 'error',
        title: 'Gagal Mengakhiri Penugasan',
        message: extractErrorMessage(error, 'Penugasan Juyar gagal diakhiri.'),
      });
    } finally {
      setEndingId(null);
    }
  }

  const active = juyars.filter(juyar => juyar.is_active);
  const ended = juyars.filter(juyar => !juyar.is_active);
  const confirmJuyar = modal?.kind === 'confirm-end' ? modal.juyar : null;
  const confirmFirstName = cleanValue(confirmJuyar?.name)?.split(' ')[0] ?? 'Juyar ini';

  return (
    <MainLayout title="Juyar" subtitle="Pengelola Tagihan Satuan" variant="canvas" onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <View style={styles.flex}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
            }>
            <View style={styles.callout}>
              <Icon name="info" size={16} color={colors.primary} />
              <Text style={styles.calloutText}>
                Juyar bisa membuka rekap tagihan seluruh anggota satuan. Akses diberikan saat ditunjuk dan dicabut saat
                penugasannya diakhiri.
              </Text>
            </View>

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            {!errorMessage && juyars.length === 0 ? (
              <EmptyState
                icon="users"
                title="Belum ada Juyar"
                message="Tunjuk prajurit untuk mengelola rekap tagihan satuan."
              />
            ) : null}

            {active.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Aktif</Text>
                  <Text style={styles.sectionMeta}>{active.length} juyar</Text>
                </View>
                <View style={styles.listCard}>
                  {active.map((juyar, index) => (
                    <View key={juyar.id} style={[styles.row, index > 0 && styles.rowDivider]}>
                      <GradientAvatar
                        label={initialsOf(juyar.name)}
                        gradientStart={colors.gradientPrimaryStart}
                        gradientEnd={colors.gradientPrimaryEnd}
                        size={44}
                      />
                      <View style={styles.body}>
                        <Text style={styles.name} numberOfLines={1}>
                          {juyar.name}
                        </Text>
                        {cleanValue(juyar.nrp) ? <Text style={styles.meta}>NRP {juyar.nrp}</Text> : null}
                        <Text style={styles.faint} numberOfLines={1}>
                          {joinFields(
                            juyar.assigned_at ? `Ditunjuk ${formatDateShort(juyar.assigned_at)}` : null,
                            juyar.notes,
                          ) || '-'}
                        </Text>
                      </View>
                      <PressableScale
                        accessibilityLabel={`Akhiri penugasan ${juyar.name}`}
                        disabled={endingId !== null}
                        onPress={() => setModal({ kind: 'confirm-end', juyar })}
                        contentStyle={styles.dangerButton}>
                        {endingId === juyar.id ? (
                          <ActivityIndicator size="small" color={colors.danger} />
                        ) : (
                          <Icon name="user-x" size={18} color={colors.danger} />
                        )}
                      </PressableScale>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {ended.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Riwayat</Text>
                  <Text style={styles.sectionMeta}>{ended.length} berakhir</Text>
                </View>
                <View style={styles.listCard}>
                  {ended.map((juyar, index) => (
                    <View key={juyar.id} style={[styles.row, index > 0 && styles.rowDivider]}>
                      <GradientAvatar
                        label={initialsOf(juyar.name)}
                        gradientStart={colors.gradientInactiveStart}
                        gradientEnd={colors.gradientInactiveEnd}
                        size={44}
                        style={styles.dim}
                      />
                      <View style={[styles.body, styles.dim]}>
                        <Text style={styles.name} numberOfLines={1}>
                          {juyar.name}
                        </Text>
                        {cleanValue(juyar.nrp) ? <Text style={styles.meta}>NRP {juyar.nrp}</Text> : null}
                        <Text style={styles.faint} numberOfLines={1}>
                          {[formatDateShort(juyar.assigned_at), formatDateShort(juyar.ended_at)]
                            .filter(value => value && value !== '-')
                            .join(' – ') || '-'}
                        </Text>
                      </View>
                      <Badge label="BERAKHIR" variant="neutral" style={styles.badge} />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerHint}>Prajurit yang ditunjuk harus sudah punya akun login</Text>
            <GradientButton
              label="Tunjuk Juyar"
              icon="user-plus"
              onPress={() => navigation.navigate(ROUTES.coopJuyarAppoint)}
            />
          </View>
        </View>
      )}

      <StatusModal
        visible={modal?.kind === 'confirm-end'}
        variant="error"
        title={`Akhiri penugasan ${confirmJuyar?.name ?? ''}?`}
        message={`${confirmFirstName} tidak bisa lagi membuka rekap tagihan satuan. Riwayat penunjukannya tetap tersimpan.`}
        onRequestClose={() => setModal(null)}
        secondaryAction={{ label: 'Batal', onPress: () => setModal(null) }}
        primaryAction={{ label: 'Akhiri', onPress: () => confirmJuyar && handleEnd(confirmJuyar) }}
      />
      <StatusModal
        visible={modal?.kind === 'result'}
        variant={modal?.kind === 'result' ? modal.variant : 'success'}
        title={modal?.kind === 'result' ? modal.title : ''}
        message={modal?.kind === 'result' ? modal.message : ''}
        onRequestClose={() => setModal(null)}
        primaryAction={{ label: 'Tutup', onPress: () => setModal(null) }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.chipSurface,
    marginBottom: 20,
  },
  calloutText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.textBody },
  error: { marginTop: 24, textAlign: 'center', fontSize: 14, color: colors.textMuted },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  sectionMeta: { fontSize: 12, color: colors.textMuted },
  listCard: {
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  body: { flex: 1, minWidth: 0, gap: 2 },
  dim: { opacity: 0.7 },
  name: { fontSize: 15, fontWeight: '700', color: colors.heading },
  meta: { fontSize: 12, color: colors.textMuted },
  faint: { fontSize: 11, color: colors.placeholder },
  badge: { alignSelf: 'center' },
  dangerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSurfaceSoft,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  footerHint: { textAlign: 'center', fontSize: 12, lineHeight: 17, color: colors.textMuted },
});
