import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import QrCode from '@/components/molecules/QrCode';
import { colors } from '@/theme/colors';
import { smallButtonShadow } from '@/theme/shadows';
import { isDisplayablePhoto } from '@/utils/avatar';
import { orDash } from '@/utils/format';

export interface MemberIdCardProps {
  // Nilai mentah `personnel.photo` dari API — di-resolve & di-fetch dengan token oleh SecureImage.
  photoPath: string | null | undefined;
  name: string;
  // NRP — juga jadi isi QR.
  serviceNumber: string | null;
  rank: string | null;
  position: string | null;
  unit: string | null;
  // Label status dinas, mis. "AKTIF".
  dutyStatusLabel: string;
  verified: boolean;
  onShowFullQr: () => void;
}

function IdentityField(props: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <Text style={styles.fieldValue} numberOfLines={1}>
        {props.value}
      </Text>
    </View>
  );
}

// "Kartu Anggota" digital di Home Anggota — identitas prajurit + QR berisi NRP untuk verifikasi
// tatap muka. Identitas datang dari `user.personnel` (GET /auth/me), status verifikasi dari
// GET /me/id-card (lihat API_CONTRACT_ANGGOTA.md §1) — sementara di-hardcode `verified`.
export default function MemberIdCard(props: MemberIdCardProps) {
  const { photoPath, name, serviceNumber, rank, position, unit, dutyStatusLabel, verified, onShowFullQr } = props;
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <View style={styles.card}>

      <View style={styles.header}>
        <Text style={styles.kicker}>Kartu Anggota</Text>
        <View style={[styles.verifyPill, verified ? styles.verifyPillOn : styles.verifyPillOff]}>
          <Icon
            name="shield-check"
            size={13}
            color={verified ? colors.success : colors.textMuted}
          />
          <Text style={[styles.verifyText, { color: verified ? colors.success : colors.textMuted }]}>
            {verified ? 'Terverifikasi' : 'Belum Verifikasi'}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.identity}>
          <View style={styles.identityTop}>
            {isDisplayablePhoto(photoPath) && !photoFailed ? (
              <SecureImage
                path={photoPath}
                style={styles.photo}
                resizeMode="cover"
                onLoadError={() => setPhotoFailed(true)}
              />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <Text style={styles.photoFallbackLabel}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.nameGroup}>
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
              <Text style={styles.nrp} numberOfLines={1}>
                {orDash(serviceNumber)}
              </Text>
            </View>
          </View>

          <View style={styles.fieldGrid}>
            <IdentityField label="Pangkat" value={orDash(rank)} />
            <IdentityField label="Jabatan" value={orDash(position)} />
          </View>
          <IdentityField label="Satuan" value={orDash(unit)} />

          <View style={styles.statusRow}>
            <Text style={styles.fieldLabel}>Status Dinas</Text>
            <Badge label={dutyStatusLabel} variant="success" />
          </View>
        </View>

        <View style={styles.qrColumn}>
          <PressableScale onPress={onShowFullQr} style={styles.qrFrame}>
            <QrCode value={serviceNumber} size={104} />
          </PressableScale>
          <PressableScale onPress={onShowFullQr} contentStyle={styles.qrButton}>
            <Icon name="search" size={13} color={colors.primary} />
            <Text style={styles.qrButtonText}>Tampilkan Penuh</Text>
          </PressableScale>
        </View>
      </View>

      <View style={styles.footer}>
        <Icon name="info" size={14} color={colors.textMuted} />
        <Text style={styles.footerText}>Tunjukkan QR Code ini untuk verifikasi identitas Anda</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.successSurface,
    backgroundColor: colors.successSurfaceSubtle,
    overflow: 'hidden',
    paddingTop: 16,
    // Bayangan ber-tint hijau (warna aksen kartu) — DESIGN_SYSTEM §1c mengizinkan warna aksen komponen.
    shadowColor: colors.gradientHealthStart,
    shadowOpacity: 0.1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.success,
  },
  verifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verifyPillOn: {
    backgroundColor: colors.successSurface,
  },
  verifyPillOff: {
    backgroundColor: colors.neutralSurface,
  },
  verifyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
  },
  identity: {
    flex: 1,
    gap: 8,
  },
  identityTop: {
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    // Rasio pas foto 3:4 (potret).
    width: 63,
    height: 84,
    borderRadius: 10,
    backgroundColor: colors.neutralSurface,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  photoFallbackLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  nameGroup: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  nrp: {
    fontSize: 12,
    color: colors.textMuted,
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
    gap: 1,
  },
  fieldLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.heading,
  },
  statusRow: {
    marginTop: 2,
    gap: 4,
  },
  qrColumn: {
    alignItems: 'center',
    gap: 8,
  },
  qrFrame: {
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...smallButtonShadow,
    shadowOpacity: 0.08,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qrButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.successSurface,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
  },
});
