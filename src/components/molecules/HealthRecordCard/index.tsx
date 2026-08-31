import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { HealthRecordSummary } from '@/types';
import { formatDateTime } from '@/utils/format';

export interface HealthRecordCardProps {
  record: HealthRecordSummary;
  onPress: () => void;
  // Sembunyikan nama petugas (mis. di layar "riwayat saya" anggota, kurang relevan).
  hideExaminer?: boolean;
}

// Kartu satu record pemeriksaan kesehatan — dipakai di dashboard petugas, profil kesehatan
// anggota, dan "Kesehatan" di tab Riwayat anggota. Menuju HealthRecordDetail saat ditekan.
export default function HealthRecordCard(props: HealthRecordCardProps) {
  const { record, onPress, hideExaminer } = props;

  return (
    <PressableScale scaleTo={0.98} onPress={onPress} contentStyle={styles.card}>
      <View style={styles.iconCircle}>
        <Icon name="heartbeat" size={18} color={colors.gradientHealthStart} />
      </View>
      <View style={styles.body}>
        <Text style={styles.type} numberOfLines={1}>
          {record.health_check_type}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatDateTime(record.examined_at) ?? '-'}
        </Text>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Hasil: </Text>
          <Text style={styles.resultValue} numberOfLines={1}>
            {record.result}
          </Text>
        </View>
        {!hideExaminer && record.examined_by ? (
          <Text style={styles.examiner} numberOfLines={1}>
            oleh {record.examined_by}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={18} color={colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  iconCircle: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSurfaceSubtle,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  type: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  resultRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.heading,
  },
  resultValue: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  examiner: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
