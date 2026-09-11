import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import type { BadgeVariant } from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getRollCallDetailApi, submitRollCallEntryApi } from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import { cardShadow, smallButtonShadow } from '@/theme/shadows';
import type { RollCallDetail } from '@/types';
import { isDisplayablePhoto } from '@/utils/avatar';
import { extractErrorMessage } from '@/utils/format';
import { entryStatusLabel } from '@/utils/rollCall';

type Props = RootStackScreenProps<typeof ROUTES.rollCallSearch>;

type RosterStatus = 'present' | 'absent' | 'unmarked';

interface RosterItem {
  personnelId: number;
  fullName: string;
  serviceNumber: string;
  photo: string | null;
  status: RosterStatus;
}

// unmarked dulu (yang butuh ditandai), lalu tidak hadir, lalu hadir.
const STATUS_ORDER: Record<RosterStatus, number> = { unmarked: 0, absent: 1, present: 2 };

const STATUS_BADGE: Record<RosterStatus, { label: string; variant: BadgeVariant }> = {
  present: { label: 'Hadir', variant: 'success' },
  absent: { label: 'Tidak Hadir', variant: 'warning' },
  unmarked: { label: 'Belum', variant: 'neutral' },
};

function buildRoster(detail: RollCallDetail): RosterItem[] {
  const rows: RosterItem[] = [
    ...detail.present.map(e => ({
      personnelId: e.personnel_id,
      fullName: e.personnel.full_name,
      serviceNumber: e.personnel.service_number,
      photo: e.personnel.photo ?? null,
      status: 'present' as RosterStatus,
    })),
    ...detail.absent.map(e => ({
      personnelId: e.personnel_id,
      fullName: e.personnel.full_name,
      serviceNumber: e.personnel.service_number,
      photo: e.personnel.photo ?? null,
      status: 'absent' as RosterStatus,
    })),
    ...detail.unmarked.map(p => ({
      personnelId: p.id,
      fullName: p.full_name,
      serviceNumber: p.service_number,
      photo: p.photo ?? null,
      status: 'unmarked' as RosterStatus,
    })),
  ];
  rows.sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.fullName.localeCompare(b.fullName),
  );
  return rows;
}

export default function RollCallSearchScreen(props: Props) {
  const { navigation, route } = props;
  const { sessionId, status } = route.params;
  const isPresent = status === 'present';
  const keyboardHeight = useKeyboardHeight();

  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(async () => {
    if (isFirstFocus.current) setIsLoading(true);
    setErrorMessage(null);
    try {
      const detail = await getRollCallDetailApi(sessionId);
      setRoster(buildRoster(detail));
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat daftar personel.'));
    } finally {
      setIsLoading(false);
      isFirstFocus.current = false;
    }
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      r => r.fullName.toLowerCase().includes(q) || r.serviceNumber.toLowerCase().includes(q),
    );
  }, [roster, query]);

  async function handleSelect(item: RosterItem) {
    if (savingId != null) return;

    if (!isPresent) {
      navigation.navigate(ROUTES.rollCallEntry, {
        sessionId,
        personnelId: item.personnelId,
        personnelName: item.fullName,
        personnelPhoto: item.photo,
        serviceNumber: item.serviceNumber,
        status: 'absent',
      });
      return;
    }

    if (item.status === 'present') return; // sudah hadir

    setSavingId(item.personnelId);
    try {
      await submitRollCallEntryApi(sessionId, { personnel_id: item.personnelId, status: 'present' });
      setRoster(prev =>
        prev.map(r => (r.personnelId === item.personnelId ? { ...r, status: 'present' } : r)),
      );
    } catch (error) {
      setErrorModal(extractErrorMessage(error, 'Gagal menyimpan kehadiran personel.'));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <MainLayout
      title="Cari Personel"
      subtitle={`${entryStatusLabel[status]} · pilih personel${isPresent ? '' : ' yang absen'}`}
      variant="canvas"
      onBack={() => navigation.goBack()}
      right={
        <PressableScale
          onPress={() => navigation.navigate(ROUTES.rollCallScan, { sessionId, status })}
          hitSlop={12}
          contentStyle={styles.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Scan QR kartu anggota">
          <Icon name="qr-code" size={20} color={colors.primary} />
        </PressableScale>
      }>

      <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
        <SearchFilterBar
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Cari nama atau NRP"
          autoFocus
          style={styles.search}
        />

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.personnelId)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const saving = savingId === item.personnelId;
              const badge = STATUS_BADGE[item.status];
              // Present mode: highlight yang sudah hadir. Absent mode: cukup badge (tap tetap bisa
              // untuk ganti keterangan).
              const done = isPresent && item.status === 'present';
              return (
                <PressableScale
                  scaleTo={0.98}
                  disabled={saving || done}
                  onPress={() => handleSelect(item)}
                  contentStyle={[styles.row, done && styles.rowDone]}>
                  <RosterAvatar photo={item.photo} name={item.fullName} status={item.status} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.fullName}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      NRP {item.serviceNumber}
                    </Text>
                  </View>
                  {saving ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <View style={styles.rowRight}>
                      <Badge label={badge.label} variant={badge.variant} />
                      {!done ? (
                        <Icon name="chevron-right" size={16} color={colors.placeholder} />
                      ) : (
                        <Icon name="check" size={16} color={colors.success} />
                      )}
                    </View>
                  )}
                </PressableScale>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.hint}>
                {errorMessage ?? (query ? 'Tidak ada personel yang cocok.' : 'Belum ada personel.')}
              </Text>
            }
          />
        )}
      </View>

      <StatusModal
        visible={errorModal !== null}
        variant="error"
        title="Gagal Menyimpan"
        message={errorModal ?? ''}
        onRequestClose={() => setErrorModal(null)}
        primaryAction={{ label: 'Tutup', onPress: () => setErrorModal(null) }}
      />
    </MainLayout>
  );
}

// Avatar berwarna sesuai status kehadiran (present/absent/unmarked) — pakai foto asli kalau ada,
// jatuh ke inisial ber-tone status kalau tidak (sama seperti pola tone di RollCallDetail).
function RosterAvatar(props: { photo: string | null; name: string; status: RosterStatus }) {
  const { photo, name, status } = props;
  const [failed, setFailed] = useState(false);

  if (isDisplayablePhoto(photo) && !failed) {
    return <SecureImage path={photo} style={styles.avatarImage} onLoadError={() => setFailed(true)} />;
  }
  return (
    <View
      style={[
        styles.avatar,
        status === 'present' && styles.avatarPresent,
        status === 'absent' && styles.avatarAbsent,
        status === 'unmarked' && styles.avatarUnmarked,
      ]}>
      <Text style={styles.avatarText}>{(name.charAt(0) || '?').toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...smallButtonShadow,
  },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  search: { marginBottom: 16 },
  loader: { marginTop: 40 },
  listContent: { paddingBottom: 32, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  rowDone: { backgroundColor: colors.successSurfaceSubtle, borderColor: colors.successSurface },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarPresent: { backgroundColor: colors.success },
  avatarAbsent: { backgroundColor: colors.warning },
  avatarUnmarked: { backgroundColor: colors.placeholder },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.primaryForeground },
  avatarImage: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.neutralSurface },
  rowBody: { flex: 1, gap: 2 },
  rowName: { fontSize: 14, fontWeight: '700', color: colors.heading },
  rowMeta: { fontSize: 12, color: colors.textMuted },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hint: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
});
