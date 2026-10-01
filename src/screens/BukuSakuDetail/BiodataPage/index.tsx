import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import SecureImage from '@/components/atoms/SecureImage';
import FamilyMemberRow from '@/components/molecules/FamilyMemberRow';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import { colors } from '@/theme/colors';
import type { HandbookBiodata, MeFamilyMember, Personnel } from '@/types';
import { isDisplayablePhoto } from '@/utils/avatar';
import {
  cleanValue,
  formatBirth,
  formatDateLong,
  genderLabel,
  joinFields,
  orDash,
  titleCase,
} from '@/utils/format';
import { ageInYears, tenureLabel } from '@/utils/handbook';

export interface BiodataPageProps {
  biodata: HandbookBiodata;
  // Profil `/auth/me` — melengkapi field yang tidak dikirim endpoint handbook (umur, data pribadi,
  // penugasan, keluarga). Hanya dipakai kalau memang orang yang sama dengan `biodata`.
  personnel: Personnel | null | undefined;
  family: MeFamilyMember[];
  onOpenFamilyMember: (member: MeFamilyMember) => void;
}

interface InfoField {
  label: string;
  value: string;
  fullWidth?: boolean;
  mono?: boolean;
}

// Isi halaman Buku Saku `record_type: "biodata"` — identitas prajurit yang sedang membuka.
export default function BiodataPage(props: BiodataPageProps) {
  const { biodata, onOpenFamilyMember } = props;
  // Jangan campur data orang lain: profil login dipakai hanya kalau personnel_id-nya cocok.
  const personnel = props.personnel?.id === biodata.personnel_id ? props.personnel : null;
  const family = personnel ? props.family : [];
  const assignment = personnel?.current_assignment ?? null;

  const rank = cleanValue(biodata.rank) ?? cleanValue(personnel?.rank);
  const position = cleanValue(biodata.position) ?? cleanValue(assignment?.position);
  const unit = cleanValue(biodata.unit) ?? cleanValue(assignment?.unit);
  const isActive = personnel?.status === 'active';

  const age = ageInYears(personnel?.birth_date);
  const personalFields: InfoField[] = personnel
    ? [
        {
          label: 'Tempat, tanggal lahir',
          value: formatBirth(
            personnel.birth_place,
            formatDateLong(personnel.birth_date) ?? personnel.birth_date_formatted,
          ),
        },
        { label: 'Jenis kelamin', value: genderLabel(personnel.gender) },
        { label: 'Golongan darah', value: orDash(personnel.blood_type) },
        { label: 'Telepon', value: orDash(personnel.phone) },
        { label: 'Alamat', value: orDash(personnel.address), fullWidth: true },
      ]
    : [];
  const serviceFields: InfoField[] = [
    { label: 'NRP', value: orDash(biodata.nrp), mono: true },
    { label: 'Pangkat', value: rank ?? '-' },
    { label: 'Jabatan', value: position ?? '-' },
    { label: 'Satuan', value: unit ?? '-' },
    ...(personnel
      ? [
          { label: 'Mulai penugasan', value: formatDateLong(assignment?.start_date) ?? '-' },
          { label: 'Status', value: isActive ? 'Aktif' : orDash(titleCase(personnel.status)) },
        ]
      : []),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.identity}>
        <View style={styles.identityTop}>
          <BiodataPhoto photo={biodata.photo_url} name={biodata.name} />
          <View style={styles.identityText}>
            <Text style={styles.name}>{biodata.name}</Text>
            <Text style={styles.nrp}>{orDash(biodata.nrp)}</Text>
          </View>
        </View>
        {rank || position || unit || isActive ? (
          <View style={styles.chips}>
            {rank ? <Chip label={rank} /> : null}
            {position ? <Chip label={position} /> : null}
            {unit ? <Chip label={unit} icon="building" /> : null}
            {isActive ? <Badge label="Aktif" variant="success" style={styles.activeBadge} /> : null}
          </View>
        ) : null}
      </View>

      {personnel ? (
        <View style={styles.statsBox}>
          <StatDividerRow
            size="md"
            style={styles.statsRow}
            items={[
              { label: 'Umur', value: age != null ? `${age} tahun` : '-', flex: 0.9 },
              { label: 'Lama menjabat', value: tenureLabel(assignment?.start_date) ?? '-', flex: 1.2 },
              { label: 'Keluarga', value: `${family.length} orang`, flex: 0.9 },
            ]}
          />
        </View>
      ) : null}

      {personalFields.length ? (
        <InfoSection icon="profile" title="DATA PRIBADI" fields={personalFields} />
      ) : null}
      <InfoSection icon="shield-check" title="DATA KEDINASAN" fields={serviceFields} />

      {personnel ? (
        <View style={styles.section}>
          <SectionHeader icon="users" title="DATA KELUARGA" />
          {family.length ? (
            <View style={styles.familyList}>
              {family.map((member, index) => (
                <FamilyMemberRow
                  key={member.id}
                  style={index < family.length - 1 ? styles.familyRowDivided : undefined}
                  name={member.full_name}
                  photo={member.photo_url ?? member.photo}
                  subtitle={joinFields(
                    member.family_relation ? titleCase(member.family_relation) : undefined,
                    member.membership_number ?? undefined,
                    member.occupation,
                  )}
                  onPress={() => onOpenFamilyMember(member)}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyFamily}>Belum ada data keluarga yang tercatat.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function BiodataPhoto(props: { photo: string | null; name: string }) {
  const { photo, name } = props;
  const [failed, setFailed] = useState(false);

  if (!isDisplayablePhoto(photo) || failed) {
    return (
      <GradientAvatar
        label={name.trim().charAt(0).toUpperCase() || '?'}
        gradientStart={colors.gradientPrimaryStart}
        gradientEnd={colors.gradientPrimaryEnd}
        size={72}
        radius={16}
      />
    );
  }
  return <SecureImage path={photo} style={styles.photo} onLoadError={() => setFailed(true)} />;
}

function Chip(props: { label: string; icon?: IconName }) {
  return (
    <View style={styles.chip}>
      {props.icon ? <Icon name={props.icon} size={13} color={colors.textMuted} /> : null}
      <Text style={styles.chipLabel}>{props.label}</Text>
    </View>
  );
}

function SectionHeader(props: { icon: IconName; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Icon name={props.icon} size={16} color={colors.primary} />
      <Text style={styles.sectionTitle}>{props.title}</Text>
    </View>
  );
}

function InfoSection(props: { icon: IconName; title: string; fields: InfoField[] }) {
  return (
    <View style={styles.section}>
      <SectionHeader icon={props.icon} title={props.title} />
      <View style={styles.grid}>
        {props.fields.map(field => (
          <View key={field.label} style={[styles.field, field.fullWidth && styles.fieldFull]}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <Text style={[styles.fieldValue, field.mono && styles.mono]}>{field.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  identity: {
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.attachmentRowSurface,
  },
  identityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.primarySurface,
  },
  identityText: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.heading,
  },
  nrp: {
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: monoFont,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.heading,
  },
  activeBadge: {
    alignSelf: 'center',
  },
  statsBox: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  statsRow: {
    paddingTop: 0,
    borderTopWidth: 0,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: colors.attachmentRowSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
    padding: 14,
  },
  field: {
    width: '50%',
    paddingRight: 12,
    gap: 3,
  },
  fieldFull: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    color: colors.heading,
  },
  mono: {
    fontFamily: monoFont,
  },
  familyList: {
    paddingHorizontal: 14,
  },
  familyRowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  emptyFamily: {
    padding: 14,
    fontSize: 13,
    color: colors.textMuted,
  },
});
