import { StyleSheet, Switch, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Badge from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';
import { cardShadow, cardShadowRaised, smallButtonShadow, tabBarShadow } from '@/theme/shadows';
import { AGENDA_STATE_META } from '@/utils/rollCall';
import type { RollCallAgendaState } from '@/utils/rollCall';

// Potongan UI bersama modul Kekuatan Apel (canvas "Redesign Kekuatan Apel"). Tidak dipakai di
// luar `src/screens/RollCall/*`, jadi sengaja tidak dipromosikan ke `src/components`.

export function SectionHeader(props: { title: string; meta?: string; metaColor?: string }) {
  const { title, meta, metaColor } = props;
  return (
    <View style={sharedStyles.sectionHeader}>
      <Text style={sharedStyles.sectionTitle}>{title}</Text>
      {meta ? (
        <Text style={[sharedStyles.sectionMeta, metaColor ? [sharedStyles.sectionMetaStrong, { color: metaColor }] : null]}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

export function ProgressBar(props: { percent: number; height?: number; color?: string }) {
  const { percent, height = 8, color = colors.primary } = props;
  const width = `${Math.max(0, Math.min(100, percent))}%` as const;
  return (
    <View style={[sharedStyles.track, { height }]}>
      <View style={[sharedStyles.fill, { width, height, backgroundColor: color }]} />
    </View>
  );
}

export function AgendaStateBadge(props: { state: RollCallAgendaState; style?: StyleProp<ViewStyle> }) {
  const meta = AGENDA_STATE_META[props.state];
  return <Badge label={meta.label} variant={meta.variant} icon={meta.icon} style={props.style} />;
}

// Baris ikon info + teks kecil (catatan penjelas di bawah list / form).
export function InfoHint(props: { text: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[sharedStyles.hintRow, props.style]}>
      <Icon name="info" size={15} color={colors.placeholder} />
      <Text style={sharedStyles.hintText}>{props.text}</Text>
    </View>
  );
}

// Kotak info bertint biru (mis. "perwakilan menerima notifikasi setelah agenda dibuka").
export function InfoCallout(props: { icon: 'bell' | 'info'; text: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[sharedStyles.callout, props.style]}>
      <Icon name={props.icon} size={18} color={colors.primary} />
      <Text style={sharedStyles.calloutText}>{props.text}</Text>
    </View>
  );
}

export function ToggleSwitch(props: { value: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <Switch
      value={props.value}
      onValueChange={props.onChange}
      disabled={props.disabled}
      trackColor={{ true: colors.primary, false: colors.dividerOnGradient }}
      thumbColor={colors.surface}
    />
  );
}

export const sharedStyles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  sectionMeta: { fontSize: 12, color: colors.textMuted },
  sectionMetaStrong: { fontWeight: '600' },
  dateLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginLeft: 2 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  cardRaised: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadowRaised,
  },
  listCard: {
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  listRowDivider: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.heading },
  rowMeta: { fontSize: 12, color: colors.textMuted },
  rowMetaFaint: { fontSize: 12, color: colors.placeholder },
  track: { borderRadius: 999, backgroundColor: colors.chipSurface, overflow: 'hidden' },
  fill: { borderRadius: 999 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 4 },
  hintText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    backgroundColor: colors.primaryTintSurface,
  },
  calloutText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textBody },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  footerHint: { textAlign: 'center', fontSize: 12, lineHeight: 17, color: colors.textMuted },
  footerWarn: { textAlign: 'center', fontSize: 12, fontWeight: '600', color: colors.warningText },
  empty: { marginTop: 32, textAlign: 'center', fontSize: 14, color: colors.textMuted },
  squareButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...smallButtonShadow,
  },
  chipButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
  },
  dangerChipButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSurfaceSoft,
  },
  field: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...smallButtonShadow,
  },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginBottom: 6 },
});
