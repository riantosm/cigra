import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import CodeChip from '@/components/atoms/CodeChip';
import GradientButton from '@/components/atoms/GradientButton';
import PressableScale from '@/components/atoms/PressableScale';
import EmptyState from '@/components/molecules/EmptyState';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getRollCallSessionTypesApi, toggleRollCallSessionTypeApi } from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import type { RollCallSessionType } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { rollCallClock } from '@/utils/rollCall';
import { InfoHint, SectionHeader, ToggleSwitch, sharedStyles } from '@/screens/RollCall/shared';

type Props = RootStackScreenProps<typeof ROUTES.rollCallSessions>;

// Daftar sesi piket (GET /roll-calls/sessions). Switch = POST /{session}/toggle (optimistis,
// dikembalikan kalau gagal); ketuk baris = ubah sesi.
export default function RollCallSessionsScreen(props: Props) {
  const { navigation } = props;
  const [sessions, setSessions] = useState<RollCallSessionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const list = await getRollCallSessionTypesApi();
      setSessions([...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat sesi piket.'));
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

  async function handleToggle(session: RollCallSessionType) {
    const next = !session.is_active;
    setSessions(list => list.map(item => (item.id === session.id ? { ...item, is_active: next } : item)));
    try {
      const confirmed = await toggleRollCallSessionTypeApi(session.id);
      setSessions(list => list.map(item => (item.id === session.id ? { ...item, is_active: confirmed } : item)));
    } catch (error) {
      setSessions(list => list.map(item => (item.id === session.id ? { ...item, is_active: session.is_active } : item)));
      setToggleError(extractErrorMessage(error, 'Status sesi gagal diubah.'));
    }
  }

  const activeCount = sessions.filter(session => session.is_active).length;

  return (
    <MainLayout
      title="Sesi Piket"
      subtitle="Dipilih saat membuka agenda apel"
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
            {!errorMessage && sessions.length === 0 ? (
              <EmptyState
                icon="clock"
                title="Belum ada sesi piket"
                message="Tambahkan sesi apel yang berlaku di satuan, mis. Apel Pagi 07.30–09.00."
              />
            ) : null}
            {sessions.length > 0 ? (
              <>
                <SectionHeader title="Daftar Sesi" meta={`${activeCount} aktif dari ${sessions.length}`} />
                <View style={sharedStyles.listCard}>
                  {sessions.map((session, index) => (
                    <View
                      key={session.id}
                      style={[sharedStyles.listRow, styles.row, index > 0 && sharedStyles.listRowDivider]}>
                      <PressableScale
                        scaleTo={0.98}
                        style={sharedStyles.flex}
                        onPress={() => navigation.navigate(ROUTES.rollCallSessionForm, { session })}
                        contentStyle={[styles.rowMain, !session.is_active && styles.inactive]}>
                        <View style={styles.timeCol}>
                          <Text style={styles.timeStart}>{rollCallClock(session.start_time) ?? '-'}</Text>
                          <Text style={sharedStyles.rowMeta}>s.d. {rollCallClock(session.end_time) ?? '-'}</Text>
                        </View>
                        <View style={styles.nameCol}>
                          <Text style={styles.name} numberOfLines={1}>
                            {session.name}
                          </Text>
                          <View style={styles.codeRow}>
                            {session.code ? <CodeChip code={session.code} /> : null}
                            <Text
                              style={[styles.state, { color: session.is_active ? colors.success : colors.textMuted }]}>
                              {session.is_active ? 'AKTIF' : 'NONAKTIF'}
                            </Text>
                          </View>
                        </View>
                      </PressableScale>
                      <ToggleSwitch value={session.is_active} onChange={() => handleToggle(session)} />
                    </View>
                  ))}
                </View>
                <InfoHint
                  style={styles.hint}
                  text="Sesi nonaktif tidak muncul saat membuka agenda. Sesi yang sudah pernah dipakai tidak bisa dihapus, cukup dinonaktifkan."
                />
              </>
            ) : null}
          </ScrollView>

          <View style={sharedStyles.footer}>
            <GradientButton
              label="Tambah Sesi"
              icon="plus"
              onPress={() => navigation.navigate(ROUTES.rollCallSessionForm)}
            />
          </View>
        </View>
      )}

      <StatusModal
        visible={toggleError !== null}
        variant="error"
        title="Gagal Mengubah Status"
        message={toggleError ?? ''}
        onRequestClose={() => setToggleError(null)}
        primaryAction={{ label: 'Tutup', onPress: () => setToggleError(null) }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 14 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  inactive: { opacity: 0.55 },
  timeCol: {
    width: 62,
    gap: 1,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: colors.borderSoft,
  },
  timeStart: { fontSize: 15, fontWeight: '700', color: colors.heading },
  nameCol: { flex: 1, minWidth: 0, gap: 5 },
  name: { fontSize: 15, fontWeight: '700', color: colors.heading },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  state: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  hint: { marginTop: 12 },
});
