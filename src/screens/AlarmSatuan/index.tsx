import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import Badge from '@/components/atoms/Badge';
import type { BadgeVariant } from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import Card from '@/components/molecules/Card';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  getCurrentStellingAlarmApi,
  getStellingAlarmHistoryApi,
  getStellingAlarmsApi,
} from '@/services/api/stellingAlarm.service';
import { colors } from '@/theme/colors';
import type { StellingAlarmActivation, StellingAlarmCode, StellingBroadcastStatus } from '@/types';
import { extractErrorMessage, formatDateTime, formatRelativeTime } from '@/utils/format';
import { contentEnterTransition } from '@/utils/motion';

type Props = RootStackScreenProps<typeof ROUTES.alarmSatuan>;

const broadcastMeta: Record<string, { label: string; variant: BadgeVariant }> = {
  sent: { label: 'Terkirim', variant: 'success' },
  pending: { label: 'Menunggu', variant: 'warning' },
  failed: { label: 'Gagal', variant: 'danger' },
};

function broadcastInfo(status: StellingBroadcastStatus) {
  return broadcastMeta[status] ?? { label: status, variant: 'neutral' as BadgeVariant };
}

function BroadcastPill({ status }: { status: StellingBroadcastStatus }) {
  const info = broadcastInfo(status);
  return <Badge label={info.label} variant={info.variant} />;
}

export default function AlarmSatuanScreen(props: Props) {
  const { navigation } = props;

  const [current, setCurrent] = useState<StellingAlarmActivation | null>(null);
  const [codes, setCodes] = useState<StellingAlarmCode[]>([]);
  const [history, setHistory] = useState<StellingAlarmActivation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const [currentResult, codesResult, historyResult] = await Promise.all([
        getCurrentStellingAlarmApi(),
        getStellingAlarmsApi(),
        getStellingAlarmHistoryApi(),
      ]);
      setCurrent(currentResult);
      setCodes(codesResult);
      setHistory(historyResult);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat data alarm stelling.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  const currentColor = codes.find(code => code.code === current?.code)?.color ?? colors.danger;

  return (
    <MainLayout
      title="Alarm Satuan"
      subtitle="Monitor status stelling & alarm"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.centerState} color={colors.primary} />
      ) : errorMessage ? (
        <Text style={styles.centerState}>{errorMessage}</Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
          }>
          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={contentEnterTransition}>
            <Text style={styles.sectionTitle}>Status Stelling Terakhir</Text>
            {current ? (
              <Card style={[styles.currentCard, { borderColor: currentColor }]}>
                <View style={styles.currentTop}>
                  <View style={[styles.currentDot, { backgroundColor: currentColor }]} />
                  <Text style={[styles.currentCode, { color: currentColor }]}>{current.code}</Text>
                  <BroadcastPill status={current.broadcast_status} />
                </View>
                <Text style={styles.currentCondition}>{current.condition}</Text>
                <View style={styles.currentMetaRow}>
                  <Icon name="clock" size={14} color={colors.textMuted} />
                  <Text style={styles.currentMeta}>
                    Diaktifkan {formatRelativeTime(current.activated_at) ?? '-'} ·{' '}
                    {formatDateTime(current.activated_at) ?? '-'}
                  </Text>
                </View>
              </Card>
            ) : (
              <Card style={styles.emptyCard}>
                <Icon name="shield-check" size={26} color={colors.textMuted} />
                <Text style={styles.emptyText}>Belum ada aktivasi alarm stelling.</Text>
              </Card>
            )}

            <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Kode Alarm Stelling</Text>
            <Card style={styles.listCard}>
              {codes.length === 0 ? (
                <Text style={styles.rowEmpty}>Belum ada kode alarm.</Text>
              ) : (
                codes.map((code, index) => (
                  <View
                    key={code.id}
                    style={[styles.codeRow, index === codes.length - 1 && styles.rowLast]}>
                    <View style={[styles.codeDot, { backgroundColor: code.color }]} />
                    <View style={styles.codeText}>
                      <Text style={styles.codeName}>{code.code}</Text>
                      <Text style={styles.codeCondition}>{code.condition}</Text>
                    </View>
                    <Text style={[styles.codeStatus, { color: code.is_active ? colors.success : colors.textMuted }]}>
                      {code.is_active ? 'Aktif' : 'Nonaktif'}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Riwayat Aktivasi</Text>
            <Card style={styles.listCard}>
              {history.length === 0 ? (
                <Text style={styles.rowEmpty}>Belum ada riwayat aktivasi.</Text>
              ) : (
                history.map((item, index) => (
                  <View
                    key={item.id}
                    style={[styles.historyRow, index === history.length - 1 && styles.rowLast]}>
                    <View style={styles.historyText}>
                      <Text style={styles.historyCode}>{item.code}</Text>
                      <Text style={styles.historyCondition}>{item.condition}</Text>
                      <Text style={styles.historyTime}>
                        {formatRelativeTime(item.activated_at) ?? '-'} ·{' '}
                        {formatDateTime(item.activated_at) ?? '-'}
                      </Text>
                    </View>
                    <BroadcastPill status={item.broadcast_status} />
                  </View>
                ))
              )}
            </Card>
          </MotiView>
        </ScrollView>
      )}
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 96,
  },
  centerState: {
    marginTop: 32,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
    marginBottom: 12,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  currentCard: {
    gap: 10,
    borderWidth: 1.5,
    shadowColor: colors.danger,
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  currentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
  },
  currentCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  currentCondition: {
    fontSize: 14,
    color: colors.text,
  },
  currentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentMeta: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 28,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  listCard: {
    paddingVertical: 4,
  },
  rowEmpty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  codeDot: {
    height: 12,
    width: 12,
    borderRadius: 6,
  },
  codeText: {
    flex: 1,
    gap: 2,
  },
  codeName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  codeCondition: {
    fontSize: 12,
    color: colors.textMuted,
  },
  codeStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  historyText: {
    flex: 1,
    gap: 2,
  },
  historyCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  historyCondition: {
    fontSize: 12,
    color: colors.textMuted,
  },
  historyTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
