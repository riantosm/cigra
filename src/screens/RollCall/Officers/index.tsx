import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import GradientAvatar from '@/components/atoms/GradientAvatar';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import EmptyState from '@/components/molecules/EmptyState';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  endRollCallOfficerApi,
  getRollCallOfficersApi,
  toggleRollCallOfficerApi,
} from '@/services/api/rollCall.service';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import type { RollCallOfficer } from '@/types';
import { extractErrorMessage, formatDateShort } from '@/utils/format';
import { COMMANDER_ROLE, initialsOf } from '@/utils/rollCall';
import { InfoHint, SectionHeader, ToggleSwitch, sharedStyles } from '@/screens/RollCall/shared';

type Props = RootStackScreenProps<typeof ROUTES.rollCallOfficers>;

type Modal =
  | { kind: 'confirm-end'; officer: RollCallOfficer }
  | { kind: 'error'; title: string; message: string }
  | null;

// Petugas piket batalyon (GET /roll-calls/officers). Tunjuk = komandan saja; switch = toggle
// (menonaktifkan mencabut role piket); tombol merah = akhiri penugasan (DELETE).
export default function RollCallOfficersScreen(props: Props) {
  const { navigation } = props;
  const roles = useAppSelector(state => state.auth.user?.roles);
  const isCommander = (roles ?? []).includes(COMMANDER_ROLE);

  const [officers, setOfficers] = useState<RollCallOfficer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);
    try {
      setOfficers(await getRollCallOfficersApi());
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat petugas piket.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(isFirstFocus.current ? 'initial' : 'refresh');
      isFirstFocus.current = false;
    }, [load]),
  );

  async function handleToggle(officer: RollCallOfficer) {
    const next = !officer.is_active;
    setOfficers(list => list.map(item => (item.id === officer.id ? { ...item, is_active: next } : item)));
    try {
      const confirmed = await toggleRollCallOfficerApi(officer.id);
      setOfficers(list => list.map(item => (item.id === officer.id ? { ...item, is_active: confirmed } : item)));
    } catch (error) {
      setOfficers(list => list.map(item => (item.id === officer.id ? { ...item, is_active: officer.is_active } : item)));
      setModal({
        kind: 'error',
        title: 'Gagal Mengubah Status',
        message: extractErrorMessage(error, 'Status petugas gagal diubah.'),
      });
    }
  }

  async function handleEnd(officer: RollCallOfficer) {
    setModal(null);
    try {
      await endRollCallOfficerApi(officer.id);
      setOfficers(list => list.filter(item => item.id !== officer.id));
    } catch (error) {
      setModal({
        kind: 'error',
        title: 'Gagal Mengakhiri Penugasan',
        message: extractErrorMessage(error, 'Penugasan gagal diakhiri.'),
      });
    }
  }

  const active = officers.filter(officer => officer.is_active);
  const inactive = officers.filter(officer => !officer.is_active);

  function renderGroup(title: string, list: RollCallOfficer[]) {
    if (list.length === 0) return null;
    return (
      <View style={styles.section}>
        <SectionHeader title={title} meta={`${list.length} petugas`} />
        <View style={sharedStyles.listCard}>
          {list.map((officer, index) => (
            <View key={officer.id} style={[sharedStyles.listRow, index > 0 && sharedStyles.listRowDivider]}>
              <GradientAvatar
                label={initialsOf(officer.name)}
                gradientStart={officer.is_active ? colors.gradientPrimaryStart : colors.gradientInactiveStart}
                gradientEnd={officer.is_active ? colors.gradientPrimaryEnd : colors.gradientInactiveEnd}
                size={44}
              />
              <View style={[styles.body, !officer.is_active && styles.dim]}>
                <Text style={styles.name} numberOfLines={1}>
                  {officer.name}
                </Text>
                {officer.username ? (
                  <Text style={sharedStyles.rowMeta} numberOfLines={1}>
                    {officer.username}
                  </Text>
                ) : null}
                {officer.appointed_at ? (
                  <Text style={styles.appointed}>Ditunjuk {formatDateShort(officer.appointed_at)}</Text>
                ) : null}
              </View>
              <PressableScale
                accessibilityLabel={`Akhiri penugasan ${officer.name}`}
                onPress={() => setModal({ kind: 'confirm-end', officer })}
                contentStyle={sharedStyles.dangerChipButton}>
                <Icon name="user-x" size={18} color={colors.danger} />
              </PressableScale>
              <ToggleSwitch value={officer.is_active} onChange={() => handleToggle(officer)} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  const confirmOfficer = modal?.kind === 'confirm-end' ? modal.officer : null;

  return (
    <MainLayout
      title="Petugas Piket"
      subtitle="Membuka dan menutup agenda apel"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={sharedStyles.loader} color={colors.primary} />
      ) : (
        <View style={sharedStyles.flex}>
          <ScrollView
            style={sharedStyles.flex}
            contentContainerStyle={sharedStyles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
            }>
            {errorMessage ? <Text style={sharedStyles.empty}>{errorMessage}</Text> : null}
            {!errorMessage && officers.length === 0 ? (
              <EmptyState
                icon="shield-check"
                title="Belum ada petugas piket"
                message="Petugas piket membuka dan menutup agenda apel. Komandan menunjuk petugasnya di sini."
              />
            ) : null}
            {renderGroup('Aktif', active)}
            {renderGroup('Nonaktif', inactive)}
            {officers.length > 0 ? (
              <InfoHint text="Petugas nonaktif kehilangan akses membuka dan menutup agenda sampai diaktifkan lagi." />
            ) : null}
          </ScrollView>

          <View style={sharedStyles.footer}>
            {isCommander ? (
              <GradientButton
                label="Tunjuk Petugas Piket"
                icon="user-plus"
                onPress={() => navigation.navigate(ROUTES.rollCallAppoint, { kind: 'officer' })}
              />
            ) : (
              <Text style={sharedStyles.footerHint}>Penunjukan petugas piket hanya oleh komandan</Text>
            )}
          </View>
        </View>
      )}

      <StatusModal
        visible={modal?.kind === 'confirm-end'}
        variant="error"
        title={`Akhiri penugasan ${confirmOfficer?.name ?? ''}?`}
        message="Petugas ini tidak bisa lagi membuka atau menutup agenda apel. Kalau hanya berhalangan sementara, cukup nonaktifkan."
        onRequestClose={() => setModal(null)}
        secondaryAction={{ label: 'Batal', onPress: () => setModal(null) }}
        primaryAction={{ label: 'Akhiri', onPress: () => confirmOfficer && handleEnd(confirmOfficer) }}
      />
      <StatusModal
        visible={modal?.kind === 'error'}
        variant="error"
        title={modal?.kind === 'error' ? modal.title : ''}
        message={modal?.kind === 'error' ? modal.message : ''}
        onRequestClose={() => setModal(null)}
        primaryAction={{ label: 'Tutup', onPress: () => setModal(null) }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  dim: { opacity: 0.7 },
  name: { fontSize: 15, fontWeight: '700', color: colors.heading },
  appointed: { fontSize: 11, color: colors.placeholder },
});
