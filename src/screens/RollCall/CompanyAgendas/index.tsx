import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import EmptyState from '@/components/molecules/EmptyState';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getRollCallCompanyAgendasApi } from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import type { RollCallCompanyAgenda, RollCallCompanyAgendaList, RollCallSubmission } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { groupByDate, rollCallDateLong, sortNewestFirst } from '@/utils/rollCall';
import { AgendaStateBadge, SectionHeader, sharedStyles } from '@/screens/RollCall/shared';

type Props = RootStackScreenProps<typeof ROUTES.rollCallCompanyAgendas>;

// Daftar agenda untuk perwakilan kompi (GET /roll-calls/companies). Tidak menampilkan batas
// waktu — endpoint ini tidak membawa `deadline`, cukup status terbuka / terkunci.
export default function RollCallCompanyAgendasScreen(props: Props) {
  const { navigation } = props;

  const [data, setData] = useState<RollCallCompanyAgendaList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);
    try {
      setData(await getRollCallCompanyAgendasApi());
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat agenda kompi.'));
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

  const companies = data?.company ?? [];
  const companyName = (unitId: number) => companies.find(company => company.id === unitId)?.name ?? 'Kompi';
  const companyLabel = companies.map(company => company.name).join(', ');

  const agendas = sortNewestFirst(data?.agendas ?? []);
  const needsFilling = agendas.filter(
    agenda => !agenda.is_locked && agenda.submission.some(item => !item.is_submitted),
  );
  const others = agendas.filter(agenda => !needsFilling.includes(agenda));

  function openForm(agenda: RollCallCompanyAgenda, submission: RollCallSubmission) {
    navigation.navigate(ROUTES.rollCallCompanyForm, {
      agendaId: agenda.id,
      unitId: submission.unit_id,
      companyName: companyName(submission.unit_id),
    });
  }

  return (
    <MainLayout
      title="Kekuatan Apel"
      subtitle={companyLabel ? `Perwakilan ${companyLabel}` : 'Perwakilan kompi'}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={sharedStyles.loader} color={colors.primary} />
      ) : (
        <ScrollView
          style={sharedStyles.flex}
          contentContainerStyle={sharedStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
          }>
          {errorMessage ? <Text style={sharedStyles.empty}>{errorMessage}</Text> : null}

          {!errorMessage && agendas.length === 0 ? (
            <EmptyState
              icon="bell"
              title={companyLabel ? `Tidak ada agenda untuk ${companyLabel}` : 'Belum ada agenda apel'}
              message="Anda akan menerima notifikasi saat Piket Batalyon membuka agenda apel."
              style={styles.emptyState}
            />
          ) : null}

          {needsFilling.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader
                title="Perlu Diisi"
                meta={`${needsFilling.length} agenda`}
                metaColor={colors.warningText}
              />
              <View style={styles.stack}>
                {needsFilling.map(agenda => (
                  <View key={agenda.id} style={sharedStyles.cardRaised}>
                    <View style={styles.cardTop}>
                      <Badge label="BELUM DIKIRIM" variant="warning" />
                      <AgendaStateBadge state="open" />
                    </View>
                    <Text style={styles.heroTitle}>{agenda.session}</Text>
                    <Text style={styles.heroSub}>
                      {rollCallDateLong(agenda.date)} · Gelombang {agenda.wave}
                    </Text>
                    <View style={styles.infoRow}>
                      <Icon name="users" size={16} color={colors.primary} />
                      <Text style={styles.infoText}>Isian bisa diperbaiki selama agenda belum terkunci.</Text>
                    </View>
                    {agenda.submission.map(submission => (
                      <GradientButton
                        key={submission.unit_id}
                        label={
                          submission.is_submitted
                            ? `Perbaiki Isian ${companyName(submission.unit_id)}`
                            : `Isi Kehadiran ${companyName(submission.unit_id)}`
                        }
                        icon="clipboard-check"
                        height={48}
                        style={styles.cta}
                        onPress={() => openForm(agenda, submission)}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {others.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Sudah Dikirim" meta={`${others.length} agenda`} />
              {groupByDate(others).map(group => (
                <View key={group.date} style={styles.dateGroup}>
                  <Text style={sharedStyles.dateLabel}>{rollCallDateLong(group.date)}</Text>
                  <View style={styles.stackTight}>
                    {group.items.map(agenda => (
                      <View key={agenda.id} style={[sharedStyles.card, styles.historyCard]}>
                        <View style={styles.historyTop}>
                          <Text style={styles.historyTitle} numberOfLines={1}>
                            {agenda.session}
                          </Text>
                          <AgendaStateBadge state={agenda.is_locked ? 'locked' : 'open'} />
                        </View>
                        {agenda.submission.map(submission => (
                          <PressableScale
                            key={submission.unit_id}
                            scaleTo={0.98}
                            onPress={() => openForm(agenda, submission)}
                            contentStyle={styles.submissionRow}>
                            <View
                              style={[
                                styles.submissionIcon,
                                {
                                  backgroundColor: submission.is_submitted
                                    ? colors.successSurface
                                    : colors.warningSurface,
                                },
                              ]}>
                              <Icon
                                name={submission.is_submitted ? 'check' : 'clock'}
                                size={12}
                                color={submission.is_submitted ? colors.success : colors.warningText}
                              />
                            </View>
                            <Text style={styles.submissionText} numberOfLines={1}>
                              {companyName(submission.unit_id)} ·{' '}
                              {submission.is_submitted ? (
                                <>
                                  <Text style={styles.submissionStrong}>{submission.present} hadir</Text> ·{' '}
                                  {submission.absent} tidak hadir
                                </>
                              ) : (
                                'tidak mengirim'
                              )}
                            </Text>
                            <Text style={styles.submissionLink}>{agenda.is_locked ? 'Lihat' : 'Perbaiki'}</Text>
                          </PressableScale>
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  emptyState: { marginTop: 24 },
  section: { marginBottom: 12 },
  stack: { gap: 14, marginBottom: 12 },
  stackTight: { gap: 10 },
  dateGroup: { marginBottom: 18 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: colors.heading, letterSpacing: -0.3 },
  heroSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.attachmentRowSurface,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.textBody },
  cta: { marginTop: 12 },
  historyCard: { gap: 8, paddingVertical: 14 },
  historyTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.heading },
  submissionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  submissionIcon: { width: 20, height: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  submissionText: { flex: 1, fontSize: 13, color: colors.textBody },
  submissionStrong: { fontWeight: '700', color: colors.heading },
  submissionLink: { fontSize: 12, fontWeight: '600', color: colors.primary },
});
