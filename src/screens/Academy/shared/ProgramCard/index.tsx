import { StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import { colors } from '@/theme/colors';
import type { AcademyProgramListItem } from '@/types';
import { formatDateShort } from '@/utils/format';
import { formatScore, programStatusBadge } from '@/utils/academy';

export interface ProgramCardProps {
  program: AcademyProgramListItem;
  onPress: () => void;
  /** Tombol CTA di dalam kartu (mis. "Lanjutkan"). Kosong = tanpa tombol. */
  ctaLabel?: string;
  onCtaPress?: () => void;
  subtitle?: string;
}

// Kartu program reusable (POV Anggota) — DESIGN_SYSTEM §5.3 + brief §55/§72.
export default function ProgramCard(props: ProgramCardProps) {
  const { program, onPress, ctaLabel, onCtaPress, subtitle } = props;
  const badge = programStatusBadge(program.status, program.participant_status);
  const deadline = program.completion_deadline ?? program.end_date;

  return (
    <PressableScale scaleTo={0.98} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.top}>
          <View style={styles.identity}>
            <Text style={styles.title} numberOfLines={2}>
              {program.title}
            </Text>
            <Text style={styles.type}>{subtitle ?? program.program_type}</Text>
          </View>
          <Badge label={badge.label} variant={badge.variant} style={styles.badge} />
        </View>

        {deadline ? (
          <View style={styles.metaRow}>
            <Icon name="calendar" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>Deadline {formatDateShort(deadline)}</Text>
          </View>
        ) : null}

        {program.final_score != null ? (
          <View style={styles.metaRow}>
            <Icon name="check" size={14} color={colors.success} />
            <Text style={styles.metaText}>Nilai akhir {formatScore(program.final_score)}</Text>
          </View>
        ) : null}

        {ctaLabel && onCtaPress ? (
          <GradientButton label={ctaLabel} height={44} onPress={onCtaPress} style={styles.cta} />
        ) : null}
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  identity: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: '700', color: colors.heading, lineHeight: 20 },
  type: { fontSize: 12, color: colors.textMuted },
  badge: { alignSelf: 'flex-start' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.textMuted },
  cta: { marginTop: 2 },
});
