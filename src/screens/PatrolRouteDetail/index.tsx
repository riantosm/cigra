import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import CodeChip from '@/components/atoms/CodeChip';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import TextField from '@/components/atoms/TextField';
import Card from '@/components/molecules/Card';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { patrolAlreadyRunningSession, startPatrolApi } from '@/services/api/patrol.service';
import { colors } from '@/theme/colors';
import { smallButtonShadow, tabBarShadow } from '@/theme/shadows';
import { extractErrorMessage } from '@/utils/format';
import { checkpointCountLabel, coordLabel, patrolRouteBusyLabel } from '@/utils/patrol';

type Props = RootStackScreenProps<typeof ROUTES.patrolRouteDetail>;

export default function PatrolRouteDetailScreen(props: Props) {
  const { navigation, route } = props;
  const patrolRoute = route.params.route;
  const keyboardHeight = useKeyboardHeight();
  const checkpoints = [...patrolRoute.checkpoints].sort(
    (a, b) => a.sequence_order - b.sequence_order,
  );
  const busyLabel = patrolRouteBusyLabel(patrolRoute, route.params.activePatrolSessionId);

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    variant: 'success' | 'error';
    title: string;
    message: string;
    outcome: 'started' | 'already-running' | 'error';
  } | null>(null);

  async function handleStart() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await startPatrolApi({
        patrol_route_id: patrolRoute.id,
        notes: notes.trim() || undefined,
      });
      setStatus({
        variant: 'success',
        title: 'Sesi Patroli Dimulai',
        message: 'Sesi patroli berhasil dimulai dengan status Sedang Berjalan.',
        outcome: 'started',
      });
    } catch (error) {
      if (patrolAlreadyRunningSession(error)) {
        setStatus({
          variant: 'error',
          title: 'Sesi Patroli Masih Berjalan',
          message:
            'Anda masih memiliki sesi patroli yang sedang berjalan. Selesaikan dulu sesi itu sebelum memulai yang baru.',
          outcome: 'already-running',
        });
      } else {
        setStatus({
          variant: 'error',
          title: 'Gagal Memulai Patroli',
          message: extractErrorMessage(error, 'Terjadi kesalahan saat memulai sesi patroli.'),
          outcome: 'error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStatusPrimary() {
    const outcome = status?.outcome;
    setStatus(null);
    if (outcome === 'started' || outcome === 'already-running') {
      navigation.replace(ROUTES.patrolActive);
    }
  }

  return (
    <MainLayout
      title={patrolRoute.name}
      subtitle={`Rute patroli · ${checkpoints.length} checkpoint`}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <CodeChip code={patrolRoute.code} />
              <Badge label="Aktif" variant="success" />
            </View>
            {patrolRoute.description ? (
              <Text style={styles.description}>{patrolRoute.description}</Text>
            ) : null}
            {busyLabel ? (
              <View style={styles.busyBanner}>
                <Icon name="info" size={14} color={colors.warningText} />
                <Text style={styles.busyText}>{busyLabel}</Text>
              </View>
            ) : null}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Icon name="map-pin" size={13} color={colors.textMuted} />
                <Text style={styles.metaText}>{checkpointCountLabel(checkpoints.length)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="qr-code" size={13} color={colors.textMuted} />
                <Text style={styles.metaText}>Verifikasi via QR checkpoint</Text>
              </View>
            </View>
          </Card>

          <Text style={styles.sectionLabel}>DAFTAR CHECKPOINT</Text>

          <Card style={styles.timelineCard}>
            {checkpoints.map((checkpoint, index) => {
              const isLast = index === checkpoints.length - 1;
              return (
                <View key={checkpoint.id} style={styles.timelineRow}>
                  <View style={styles.timelineGutter}>
                    <View style={[styles.node, index === 0 && styles.nodeFirst]}>
                      <Text style={[styles.nodeText, index === 0 && styles.nodeTextFirst]}>
                        {checkpoint.sequence_order}
                      </Text>
                    </View>
                    {!isLast ? <View style={styles.connector} /> : null}
                  </View>
                  <View style={[styles.timelineBody, !isLast && styles.timelineBodyGap]}>
                    <Text style={styles.checkpointName}>{checkpoint.name}</Text>
                    <View style={styles.checkpointMeta}>
                      <CodeChip code={checkpoint.qr_code} />
                      <Text style={styles.radiusText}>radius {checkpoint.radius_meters} m</Text>
                    </View>
                    <Text style={styles.coordText}>
                      {coordLabel(checkpoint.latitude, checkpoint.longitude)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>

          <Card style={styles.notesCard}>
            <View style={styles.notesLabel}>
              <View style={styles.notesChip}>
                <Icon name="file" size={15} color={colors.primary} />
              </View>
              <Text style={styles.notesLabelText}>Catatan Awal</Text>
              <Text style={styles.notesOptional}>opsional</Text>
            </View>
            <TextField
              placeholder="mis. Mulai dari pos jaga utama, cuaca cerah."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.notesInput}
              containerStyle={styles.notesField}
            />
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          {busyLabel ? <Text style={styles.footerHint}>{busyLabel}</Text> : null}
          <GradientButton
            label="Mulai Patroli Rute Ini"
            icon="play"
            loading={isSubmitting}
            disabled={!!busyLabel}
            onPress={handleStart}
          />
        </View>
      </View>

      <StatusModal
        visible={status !== null}
        variant={status?.variant ?? 'success'}
        title={status?.title ?? ''}
        message={status?.message ?? ''}
        onRequestClose={() => setStatus(null)}
        primaryAction={{
          label:
            status?.outcome === 'started'
              ? 'Lihat Sesi'
              : status?.outcome === 'already-running'
                ? 'Lihat Patroli Berjalan'
                : 'Tutup',
          onPress: handleStatusPrimary,
        }}
        secondaryAction={
          status?.outcome === 'already-running'
            ? { label: 'Batal', onPress: () => setStatus(null) }
            : undefined
        }
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 120, gap: 16 },
  summaryCard: { gap: 8 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  description: { fontSize: 13, color: colors.textBody, lineHeight: 19 },
  busyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningSurface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  busyText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.warningText },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.textMuted },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.primary, letterSpacing: 0.4 },
  timelineCard: { paddingBottom: 4 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineGutter: { alignItems: 'center' },
  node: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeFirst: { backgroundColor: colors.primary },
  nodeText: { fontSize: 13, fontWeight: '800', color: colors.primary },
  nodeTextFirst: { color: colors.primaryForeground },
  connector: { width: 2, flex: 1, backgroundColor: colors.borderSoft, marginTop: 4 },
  timelineBody: { flex: 1, gap: 3 },
  timelineBodyGap: { paddingBottom: 16 },
  checkpointName: { fontSize: 14, fontWeight: '700', color: colors.heading },
  checkpointMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  radiusText: { fontSize: 11, color: colors.textMuted },
  coordText: { fontSize: 11, color: colors.placeholder },
  notesCard: { gap: 12 },
  notesLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notesChip: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesLabelText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.heading },
  notesOptional: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  notesField: { marginBottom: 0 },
  notesInput: {
    minHeight: 84,
    borderRadius: 14,
    borderColor: colors.borderSoft,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    color: colors.heading,
    textAlignVertical: 'top',
    ...smallButtonShadow,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  footerHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
