import { StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import GradientIconChip from '@/components/atoms/GradientIconChip';
import Icon from '@/components/atoms/Icon';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import type { StatDividerItem } from '@/components/molecules/StatDividerRow';
import { colors } from '@/theme/colors';
import type { HandbookAbilityRecord } from '@/types';
import { cleanValue, formatDateShort, joinFields } from '@/utils/format';
import type { AbilityValueSize } from '@/utils/handbook';
import {
  abilityFinalValue,
  abilityNameFromTitle,
  abilityStatusMeta,
  abilityValueSize,
  formatAbilityValue,
} from '@/utils/handbook';

export interface AbilityPageProps {
  // Judul halaman ("NILAI — …") — sumber nama kemampuan kalau riwayatnya masih kosong.
  title: string;
  // Riwayat penilaian, terbaru dulu (`abilityHistory`). Kosong = belum pernah dinilai.
  records: HandbookAbilityRecord[];
}

// Nilai yang lebih panjang dari ini tidak muat di satu kolom StatDividerRow (teksnya menciut) —
// ditampilkan sebagai baris penuh yang membungkus.
const INLINE_VALUE_MAX = 14;
// Kolom "Nilai terakhir" di ringkasan hanya untuk nilai pendek; nilai panjang cukup di kartunya.
const SUMMARY_VALUE_MAX = 10;

// Isi halaman Buku Saku `record_type: "ability:<id>"` — ringkasan + riwayat semua penilaian satu
// kemampuan (`ability_records`, terbaru dulu).
export default function AbilityPage(props: AbilityPageProps) {
  const { title, records } = props;
  const latest = records[0] ?? null;
  const unit = cleanValue(latest?.unit);

  return (
    <View>
      <View style={styles.abilityStrip}>
        <GradientIconChip
          icon="target"
          colors={[colors.gradientPrimaryStart, colors.gradientPrimaryEnd]}
          size={40}
          iconSize={20}
          radius={12}
        />
        <View style={styles.abilityText}>
          <Text style={styles.abilityName}>{latest?.name ?? abilityNameFromTitle(title)}</Text>
          {latest ? (
            <Text style={styles.abilityMeta}>
              {joinFields(latest.category, unit ? `satuan ${unit}` : null) || '-'}
            </Text>
          ) : null}
        </View>
      </View>

      {latest ? (
        <>
          <View style={styles.summaryBox}>
            <StatDividerRow size="md" style={styles.summaryRow} items={summaryItems(records)} />
          </View>

          <Text style={styles.sectionTitle}>Riwayat Penilaian</Text>
          <View style={styles.history}>
            {records.map((record, index) => (
              <AssessmentCard
                key={`${record.assessment_date ?? 'x'}-${index}`}
                record={record}
                unit={unit}
              />
            ))}
          </View>
          <Text style={styles.footnote}>
            Nilai akhir diisi instruktur saat verifikasi. Tanda "–" berarti belum ada nilai akhir
            (masih menunggu atau perlu diperbaiki).
          </Text>
        </>
      ) : (
        <NotAssessed />
      )}
    </View>
  );
}

function summaryItems(records: HandbookAbilityRecord[]): StatDividerItem[] {
  const latest = records[0];
  const latestValue = formatAbilityValue(latest, latest.value);
  const verifiedCount = records.filter(record => record.status === 'approved').length;
  return [
    { label: 'Penilaian', value: `${records.length}×` },
    ...(latestValue && latestValue.length <= SUMMARY_VALUE_MAX
      ? [{ label: 'Nilai terakhir', value: latestValue }]
      : []),
    { label: 'Terverifikasi', value: String(verifiedCount) },
  ];
}

function AssessmentCard(props: { record: HandbookAbilityRecord; unit: string | null }) {
  const { record, unit } = props;
  const status = abilityStatusMeta(record.status);
  const finalValue = formatAbilityValue(record, abilityFinalValue(record));
  const submittedValue = formatAbilityValue(record, record.submitted_value) ?? '–';
  const verifiedAt =
    record.status !== 'pending' && record.verified_at ? formatDateShort(record.verified_at) : null;
  const instructor = cleanValue(record.instructor);
  const note = cleanValue(record.instructor_note);
  const rejection = cleanValue(record.rejection_reason);

  const details: StatDividerItem[] = [
    { label: 'Nilai diajukan', value: submittedValue },
    ...(verifiedAt ? [{ label: 'Diverifikasi', value: verifiedAt }] : []),
  ];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Badge label={status.label} variant={status.variant} icon={status.icon} />
        {record.assessment_date ? (
          <View style={styles.dateRow}>
            <Icon name="calendar" size={14} color={colors.textMuted} />
            <Text style={styles.dateText}>{formatDateShort(record.assessment_date)}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.valueLabel}>Nilai akhir</Text>
      {finalValue ? (
        <FinalValue value={finalValue} size={abilityValueSize(finalValue)} unit={unit} />
      ) : (
        <View style={styles.valueRow}>
          <Text style={[styles.value, styles.valueEmpty]}>–</Text>
          <Text style={styles.valueEmptyHint}>belum ada nilai akhir</Text>
        </View>
      )}

      {submittedValue.length <= INLINE_VALUE_MAX ? (
        <StatDividerRow size="md" style={styles.details} items={details} />
      ) : (
        <View style={styles.detailList}>
          {details.map(item => (
            <View key={item.label} style={styles.detailItem}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailText}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}

      {instructor ? (
        <View style={styles.instructorRow}>
          <Icon name="profile" size={14} color={colors.textMuted} />
          <Text style={styles.instructorText}>
            Instruktur: <Text style={styles.instructorName}>{instructor}</Text>
          </Text>
        </View>
      ) : null}

      {note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>CATATAN INSTRUKTUR</Text>
          <Text style={styles.noteText}>{note}</Text>
        </View>
      ) : null}

      {rejection ? (
        <View style={styles.rejectionBox}>
          <Text style={styles.rejectionText}>
            <Text style={styles.rejectionLabel}>Alasan: </Text>
            {rejection}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function FinalValue(props: { value: string; size: AbilityValueSize; unit: string | null }) {
  const { value, size, unit } = props;
  if (size === 'long') return <Text style={styles.valueLong}>{value}</Text>;
  return (
    <View style={styles.valueRow}>
      <Text style={[styles.value, size === 'short' && styles.valueShort]}>{value}</Text>
      {size === 'number' && unit ? <Text style={styles.valueUnit}>{unit}</Text> : null}
    </View>
  );
}

function NotAssessed() {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>
        <Icon name="clipboard-check" size={24} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Belum ada nilai</Text>
      <Text style={styles.emptyMessage}>
        Nilai muncul setelah prajurit mengajukan dan instruktur memverifikasi.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  abilityStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.attachmentRowSurface,
  },
  abilityText: {
    flex: 1,
    gap: 2,
  },
  abilityName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  abilityMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  summaryBox: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  summaryRow: {
    paddingTop: 0,
    borderTopWidth: 0,
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  history: {
    gap: 10,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  valueLabel: {
    marginTop: 14,
    fontSize: 12,
    color: colors.textMuted,
  },
  valueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 6,
    marginTop: 2,
  },
  value: {
    flexShrink: 1,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 38,
    color: colors.heading,
  },
  valueShort: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  valueLong: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    color: colors.heading,
  },
  valueUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  valueEmpty: {
    color: colors.dividerOnGradient,
  },
  valueEmptyHint: {
    fontSize: 13,
    color: colors.textMuted,
  },
  details: {
    marginTop: 12,
  },
  detailList: {
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: colors.textBody,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  instructorText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  instructorName: {
    fontWeight: '600',
    color: colors.heading,
  },
  noteBox: {
    marginTop: 10,
    padding: 12,
    gap: 4,
    borderRadius: 12,
    backgroundColor: colors.pageGradientMid,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textBody,
  },
  rejectionBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorderSoft,
    backgroundColor: colors.dangerSurfaceSoft,
  },
  rejectionText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.dangerText,
  },
  rejectionLabel: {
    fontWeight: '700',
  },
  footnote: {
    marginTop: 12,
    marginHorizontal: 2,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  emptyBox: {
    marginTop: 12,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.pageGradientStart,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  emptyMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
