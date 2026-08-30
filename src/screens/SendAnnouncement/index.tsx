import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import Card from '@/components/molecules/Card';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { announcementCreated, announcementDeleted } from '@/store/slices/announcementSlice';
import type { AnnouncementScope, AnnouncementType } from '@/store/slices/announcementSlice';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';
import { formatDateTime, formatRelativeTime } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.sendAnnouncement>;

const BODY_MAX = 1000;
const TITLE_MAX = 80;
const HISTORY_PREVIEW = 3;

const typeMeta: Record<AnnouncementType, { label: string; icon: IconName; color: string; surface: string }> = {
  announcement: { label: 'Pengumuman', icon: 'megaphone', color: colors.primary, surface: colors.primarySurface },
  alert: { label: 'Peringatan', icon: 'bell', color: colors.danger, surface: colors.dangerSurface },
  info: { label: 'Info', icon: 'info', color: colors.textMuted, surface: colors.neutralSurface },
};

const scopeLabel: Record<AnnouncementScope, string> = {
  all: 'Semua Personel',
  unit: 'Satuan Anda',
  role: 'Per Peran',
};

interface FieldHeaderProps {
  icon: IconName;
  label: string;
  color: string;
  surface: string;
}

function FieldHeader(props: FieldHeaderProps) {
  return (
    <View style={styles.fieldHeader}>
      <View style={[styles.fieldIcon, { backgroundColor: props.surface }]}>
        <Icon name={props.icon} size={15} color={props.color} />
      </View>
      <Text style={styles.fieldLabel}>{props.label}</Text>
    </View>
  );
}

export default function SendAnnouncementScreen(props: Props) {
  const { navigation } = props;
  const dispatch = useAppDispatch();
  const senderName = useAppSelector(state => state.auth.user?.name ?? 'Komandan');
  const sent = useAppSelector(state => state.announcements.sent);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<AnnouncementType>('announcement');
  const [scope, setScope] = useState<AnnouncementScope>('all');
  const [successVisible, setSuccessVisible] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;
  const visibleHistory = showAllHistory ? sent : sent.slice(0, HISTORY_PREVIEW);

  function handleSubmit() {
    if (!canSubmit) return;
    dispatch(
      announcementCreated({
        type,
        title: title.trim(),
        body: body.trim(),
        severity: 'normal',
        scope,
        scope_label: scopeLabel[scope],
        created_by_name: senderName,
      }),
    );
    setTitle('');
    setBody('');
    setType('announcement');
    setScope('all');
    setSuccessVisible(true);
  }

  return (
    <MainLayout title="Kirim Pengumuman" onBack={() => navigation.goBack()}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={contentEnterTransition}>
            <Card style={styles.formCard}>
              <View style={styles.field}>
                <FieldHeader icon="handbook" label="Judul" color={colors.primary} surface={colors.primarySurface} />
                <TextField
                  placeholder="mis. Apel Pagi"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={TITLE_MAX}
                />
              </View>

              <View style={styles.field}>
                <FieldHeader
                  icon="megaphone"
                  label="Isi Pengumuman"
                  color={colors.gradientWeaponStart}
                  surface={colors.neutralSurface}
                />
                <View>
                  <TextField
                    placeholder="Tulis isi pengumuman..."
                    value={body}
                    onChangeText={setBody}
                    multiline
                    maxLength={BODY_MAX}
                    style={styles.bodyInput}
                  />
                  <Text style={styles.counter}>
                    {body.length}/{BODY_MAX}
                  </Text>
                </View>
              </View>

              <View style={styles.field}>
                <FieldHeader icon="layers" label="Tipe" color={colors.primary} surface={colors.primarySurface} />
                <SegmentedControl
                  value={type}
                  onChange={setType}
                  options={[
                    { value: 'announcement', label: 'Pengumuman', icon: 'megaphone' },
                    { value: 'alert', label: 'Peringatan', icon: 'bell' },
                    { value: 'info', label: 'Info', icon: 'info' },
                  ]}
                />
              </View>

              <View style={styles.field}>
                <FieldHeader icon="users" label="Kirim ke" color={colors.warning} surface={colors.warningSurface} />
                <SegmentedControl
                  value={scope}
                  onChange={setScope}
                  options={[
                    { value: 'all', label: 'Semua', icon: 'globe' },
                    { value: 'unit', label: 'Satuan', icon: 'building' },
                    { value: 'role', label: 'Peran', icon: 'profile' },
                  ]}
                />
              </View>
            </Card>

            <Button
              label="Kirim Pengumuman"
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={styles.submit}
            />

            <View style={styles.historyHeader}>
              <View style={styles.historyHeaderLeft}>
                <Icon name="history" size={16} color={colors.primary} />
                <Text style={styles.historyTitle}>Riwayat Terkirim</Text>
                <View style={styles.historyCountPill}>
                  <Text style={styles.historyCountText}>{sent.length}</Text>
                </View>
              </View>
              {sent.length > HISTORY_PREVIEW ? (
                <PressableScale onPress={() => setShowAllHistory(value => !value)} hitSlop={8}>
                  <View style={styles.seeAll}>
                    <Text style={styles.seeAllText}>{showAllHistory ? 'Ringkas' : 'Lihat semua'}</Text>
                    <Icon
                      name={showAllHistory ? 'chevron-down' : 'chevron-right'}
                      size={14}
                      color={colors.primary}
                    />
                  </View>
                </PressableScale>
              ) : null}
            </View>

            {sent.length === 0 ? (
              <Text style={styles.empty}>Belum ada pengumuman terkirim.</Text>
            ) : (
              <View style={styles.historyList}>
                {visibleHistory.map(item => {
                  const meta = typeMeta[item.type];
                  return (
                    <Card key={item.id} style={styles.histCard}>
                      <View style={styles.histRow}>
                        <View style={[styles.histIcon, { backgroundColor: meta.surface }]}>
                          <Icon name={meta.icon} size={18} color={meta.color} />
                        </View>
                        <View style={styles.histBody}>
                          <View style={styles.histTop}>
                            <View style={[styles.typePill, { backgroundColor: meta.surface }]}>
                              <Text style={[styles.typePillLabel, { color: meta.color }]}>{meta.label}</Text>
                            </View>
                            <PressableScale
                              onPress={() => dispatch(announcementDeleted(item.id))}
                              hitSlop={8}
                              style={styles.deleteButton}>
                              <Icon name="trash" size={13} color={colors.danger} />
                              <Text style={styles.deleteLabel}>Hapus</Text>
                            </PressableScale>
                          </View>
                          <Text style={styles.histTitle}>{item.title}</Text>
                          <Text style={styles.histText} numberOfLines={2}>
                            {item.body}
                          </Text>
                          <View style={styles.histMetaRow}>
                            <View style={styles.histMetaItem}>
                              <Icon name="users" size={12} color={colors.textMuted} />
                              <Text style={styles.histMeta}>{item.scope_label}</Text>
                            </View>
                            <View style={styles.histMetaItem}>
                              <Icon name="clock" size={12} color={colors.textMuted} />
                              <Text style={styles.histMeta}>{formatRelativeTime(item.created_at) ?? '-'}</Text>
                            </View>
                            <View style={styles.histMetaItem}>
                              <Icon name="calendar" size={12} color={colors.textMuted} />
                              <Text style={styles.histMeta}>{formatDateTime(item.created_at) ?? '-'}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>

      <StatusModal
        visible={successVisible}
        variant="success"
        title="Pengumuman Terkirim"
        message="Pengumuman masuk ke daftar notifikasi personel."
        onRequestClose={() => setSuccessVisible(false)}
        primaryAction={{ label: 'Selesai', onPress: () => setSuccessVisible(false) }}
        secondaryAction={{
          label: 'Lihat Notifikasi',
          onPress: () => {
            setSuccessVisible(false);
            navigation.navigate(ROUTES.notifications);
          },
        }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 96,
  },
  formCard: {
    gap: 20,
  },
  field: {
    gap: 10,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldIcon: {
    height: 30,
    width: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  bodyInput: {
    minHeight: 120,
    paddingTop: 12,
    paddingBottom: 28,
    textAlignVertical: 'top',
  },
  counter: {
    position: 'absolute',
    right: 14,
    bottom: 10,
    fontSize: 11,
    color: colors.textMuted,
  },
  submit: {
    marginTop: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 32,
    marginBottom: 12,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  historyCountPill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: colors.neutralSurface,
    alignItems: 'center',
  },
  historyCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 8,
  },
  historyList: {
    gap: 12,
  },
  histCard: {
    padding: 14,
  },
  histRow: {
    flexDirection: 'row',
    gap: 12,
  },
  histIcon: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  histBody: {
    flex: 1,
    gap: 4,
  },
  histTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typePillLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  histTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  histText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  histMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  histMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  histMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
