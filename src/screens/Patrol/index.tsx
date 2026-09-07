import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import CodeChip from '@/components/atoms/CodeChip';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getActivePatrolSessionApi, getPatrolRoutesApi } from '@/services/api/patrol.service';
import { colors } from '@/theme/colors';
import type { PatrolRoute, PatrolSession } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import {
  checkpointCountLabel,
  isPatrolRouteLocked,
  patrolClockLabel,
  patrolDurationLabel,
  patrolProgressPercent,
  patrolRouteBusyLabel,
  patrolRouteOngoingIsMine,
} from '@/utils/patrol';

type Props = RootStackScreenProps<typeof ROUTES.patrol>;

export default function PatrolScreen(props: Props) {
  const { navigation } = props;

  const [session, setSession] = useState<PatrolSession | null>(null);
  const [routes, setRoutes] = useState<PatrolRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);
    setErrorMessage(null);
    const [sessionResult, routesResult] = await Promise.allSettled([
      getActivePatrolSessionApi(),
      getPatrolRoutesApi(),
    ]);
    if (sessionResult.status === 'fulfilled') setSession(sessionResult.value);
    if (routesResult.status === 'fulfilled') setRoutes(routesResult.value);
    if (sessionResult.status === 'rejected' && routesResult.status === 'rejected') {
      setErrorMessage(extractErrorMessage(routesResult.reason, 'Gagal memuat data patroli.'));
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(isFirstFocus.current ? 'initial' : 'refresh');
      isFirstFocus.current = false;
    }, [load]),
  );

  const percent = session
    ? patrolProgressPercent(session.completed_checkpoints, session.total_checkpoints)
    : 0;

  return (
    <MainLayout
      title="Patroli"
      subtitle="Rute patroli & sesi keliling satuan"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={styles.flex}>
        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => load('refresh')}
                tintColor={colors.primary}
              />
            }>
            {session ? (
              <>
                <Text style={styles.sectionLabel}>SESI BERJALAN</Text>
                <PressableScale
                  scaleTo={0.98}
                  onPress={() => navigation.navigate(ROUTES.patrolActive)}>
                  <Card style={styles.sessionCard}>
                    <View style={styles.sessionTop}>
                      <View style={styles.sessionIdentity}>
                        <Text style={styles.sessionName} numberOfLines={1}>
                          {session.route?.name ?? 'Patroli'}
                        </Text>
                        {session.route?.code ? <CodeChip code={session.route.code} /> : null}
                      </View>
                      <Badge label="Berjalan" variant="success" />
                    </View>
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Icon name="clock" size={13} color={colors.textMuted} />
                        <Text style={styles.metaText}>
                          Mulai {patrolClockLabel(session.started_at)} WIB
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Icon name="clock" size={13} color={colors.textMuted} />
                        <Text style={styles.metaText}>
                          Berlangsung {patrolDurationLabel(session.started_at)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.progressHead}>
                      <Text style={styles.progressText}>
                        {session.completed_checkpoints} dari {session.total_checkpoints} checkpoint
                        selesai
                      </Text>
                      <Text style={styles.progressPercent}>{percent}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${percent}%` }]} />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.cardCta}>
                      <Text style={styles.cardCtaText}>Lihat sesi berjalan</Text>
                      <Icon name="chevron-right" size={18} color={colors.primary} />
                    </View>
                  </Card>
                </PressableScale>
              </>
            ) : null}

            <View style={styles.routesHead}>
              <Text style={styles.sectionLabel}>RUTE PATROLI AKTIF</Text>
              <Text style={styles.routesCount}>{routes.length} rute</Text>
            </View>

            {routes.length === 0 ? (
              <Text style={styles.empty}>{errorMessage ?? 'Belum ada rute patroli aktif.'}</Text>
            ) : (
              routes.map(route => {
                const busyLabel = patrolRouteBusyLabel(route, session?.id);
                const locked = isPatrolRouteLocked(route, session?.id);
                const isMine = patrolRouteOngoingIsMine(route, session?.id);
                const checkpointCount = route.checkpoints_count ?? route.checkpoints.length;
                return (
                  <PressableScale
                    key={route.id}
                    scaleTo={locked ? 1 : 0.98}
                    disabled={locked}
                    onPress={() =>
                      isMine
                        ? navigation.navigate(ROUTES.patrolActive)
                        : navigation.navigate(ROUTES.patrolRouteDetail, {
                            route,
                            activePatrolSessionId: session?.id,
                          })
                    }>
                    <Card style={[styles.routeCard, locked ? styles.routeCardLocked : null]}>
                      <View
                        style={[styles.routeIconChip, busyLabel ? styles.routeIconChipBusy : null]}>
                        <Icon
                          name="route"
                          size={20}
                          color={busyLabel ? colors.textMuted : colors.primary}
                        />
                      </View>
                      <View style={styles.routeBody}>
                        <View style={styles.routeTop}>
                          <Text style={styles.routeName} numberOfLines={1}>
                            {route.name}
                          </Text>
                          {locked ? (
                            <Icon name="lock" size={15} color={colors.placeholder} />
                          ) : (
                            <Icon name="chevron-right" size={18} color={colors.placeholder} />
                          )}
                        </View>
                        <CodeChip code={route.code} />
                        {route.description ? (
                          <Text style={styles.routeDesc} numberOfLines={2}>
                            {route.description}
                          </Text>
                        ) : null}
                        <View style={styles.metaItem}>
                          <Icon name="map-pin" size={13} color={colors.textMuted} />
                          <Text style={styles.metaText}>
                            {checkpointCountLabel(checkpointCount)}
                          </Text>
                        </View>
                        {busyLabel ? (
                          <View style={styles.busyBanner}>
                            <Icon name="info" size={13} color={colors.warningText} />
                            <Text style={styles.busyText}>{busyLabel}</Text>
                          </View>
                        ) : null}
                      </View>
                    </Card>
                  </PressableScale>
                );
              })
            )}
          </ScrollView>
        )}
      </View>

    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  content: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 32, gap: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.primary, letterSpacing: 0.4 },
  sessionCard: { gap: 12 },
  sessionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sessionIdentity: { flex: 1, gap: 6, alignItems: 'flex-start' },
  sessionName: { fontSize: 15, fontWeight: '700', color: colors.heading },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.textMuted },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { fontSize: 12, color: colors.textMuted },
  progressPercent: { fontSize: 12, fontWeight: '700', color: colors.success },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.success },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  cardCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardCtaText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  routesHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routesCount: { fontSize: 12, color: colors.textMuted },
  empty: { textAlign: 'center', fontSize: 14, color: colors.textMuted, paddingVertical: 20 },
  routeCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  routeCardLocked: { opacity: 0.6 },
  routeIconChip: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeIconChipBusy: { backgroundColor: colors.chipSurface },
  routeBody: { flex: 1, gap: 6 },
  busyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningSurface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 2,
  },
  busyText: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.warningText },
  routeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  routeName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.heading },
  routeDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
});
