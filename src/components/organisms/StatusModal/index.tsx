import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import GradientButton from '@/components/atoms/GradientButton';
import PressableScale from '@/components/atoms/PressableScale';
import type { ButtonVariant } from '@/components/atoms/Button';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';
import { parseReleaseNotes } from '@/utils/releaseNotes';

export type StatusModalVariant = 'success' | 'error';

// Glyph di badge ikon. Default mengikuti `variant` (success → centang, error → segitiga).
// `download` dipakai layar cek versi (AppVersionGate) supaya modal "Update" tetap bertema
// primary/biru tapi ikonnya tetap bermakna "unduh pembaruan", bukan centang "selesai".
export type StatusModalIcon = StatusModalVariant | 'download' | 'clock';

export interface StatusModalAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
}

export interface StatusModalProps {
  visible: boolean;
  variant: StatusModalVariant;
  /** Override glyph badge; default = `variant`. */
  icon?: StatusModalIcon;
  title: string;
  message: string;
  /**
   * Teks panjang tambahan (mis. `release_notes` dari GET /app-version) — dirender rata-kiri di
   * dalam blok yang bisa di-scroll (maks. tinggi terbatas) di bawah `message`, dengan heading &
   * bullet dari `parseReleaseNotes`. Tombol aksi tetap kelihatan seberapa pun panjang teksnya.
   */
  details?: string;
  primaryAction: StatusModalAction;
  secondaryAction?: StatusModalAction;
  onRequestClose: () => void;
}

const accentByVariant: Record<StatusModalVariant, string> = {
  success: colors.primary,
  error: colors.danger,
};

const haloByVariant: Record<StatusModalVariant, string> = {
  success: colors.haloPrimary,
  error: colors.haloDanger,
};

const gradientStops: Record<StatusModalVariant, [string, string]> = {
  success: [colors.gradientPrimaryStart, colors.gradientPrimaryEnd],
  error: [colors.gradientDangerCtaStart, colors.danger],
};

// Icon badge glyph — inlined (not the shared Icon atom) so the stroke weight matches
// DESIGN_SYSTEM §5.15: success check `2.4`, error alert-triangle `2`, download `2`.
const glyphByIcon: Record<StatusModalIcon, { d: string; strokeWidth: number }> = {
  success: { d: 'M5 13l4 4L19 7', strokeWidth: 2.4 },
  error: { d: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z M12 9v4M12 17h.01', strokeWidth: 2 },
  download: { d: 'M12 3v11M7 10l5 5 5-5M5 20h14', strokeWidth: 2 },
  clock: { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 6v6l4 2', strokeWidth: 2 },
};

// Popup konfirmasi / hasil aksi (DESIGN_SYSTEM §5.15) — dipakai untuk SEMUA feedback aksi
// (sukses/gagal) & konfirmasi destruktif, bukan `Alert.alert`. Artboard: "Emergency Popup"
// (success, 1 tombol) & "Settings Popup" (error, 2 tombol).
export default function StatusModal(props: StatusModalProps) {
  const { visible, variant, icon, title, message, details, primaryAction, secondaryAction, onRequestClose } =
    props;
  const detailBlocks = details ? parseReleaseNotes(details) : [];
  const accent = accentByVariant[variant];
  const [from, to] = gradientStops[variant];
  const glyph = glyphByIcon[icon ?? variant];
  const primaryTone = primaryAction.variant === 'danger' || variant === 'error' ? 'danger' : 'primary';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={contentEnterTransition}
          style={styles.card}>
          <View style={[styles.halo, { backgroundColor: haloByVariant[variant] }]}>
            <View style={[styles.badge, { shadowColor: accent, backgroundColor: to }]}>
              <Svg style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id={`statusModal-${variant}`} x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={from} />
                    <Stop offset="1" stopColor={to} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" rx={32} ry={32} fill={`url(#statusModal-${variant})`} />
              </Svg>
              <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
                <Path
                  d={glyph.d}
                  stroke={colors.primaryForeground}
                  strokeWidth={glyph.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {detailBlocks.length > 0 ? (
            <ScrollView
              style={styles.details}
              contentContainerStyle={styles.detailsContent}
              nestedScrollEnabled>
              {detailBlocks.map((block, index) => {
                if (block.kind === 'heading') {
                  return (
                    <Text
                      key={index}
                      style={[styles.detailHeading, index > 0 && styles.detailHeadingSpaced]}>
                      {block.text}
                    </Text>
                  );
                }
                if (block.kind === 'bullet') {
                  return (
                    <View key={index} style={styles.detailBullet}>
                      <View style={styles.detailDot} />
                      <Text style={styles.detailBulletText}>{block.text}</Text>
                    </View>
                  );
                }
                return (
                  <Text key={index} style={styles.detailText}>
                    {block.text}
                  </Text>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.actions}>
            {secondaryAction ? (
              <PressableScale
                onPress={secondaryAction.onPress}
                style={styles.actionButton}
                contentStyle={styles.secondaryButton}
                accessibilityRole="button"
                accessibilityLabel={secondaryAction.label}>
                <Text style={styles.secondaryLabel}>{secondaryAction.label}</Text>
              </PressableScale>
            ) : null}
            <GradientButton
              label={primaryAction.label}
              tone={primaryTone}
              height={52}
              onPress={primaryAction.onPress}
              style={styles.actionButton}
            />
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.text,
    shadowOpacity: 0.35,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 30 },
    elevation: 16,
  },
  halo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  badge: {
    height: 64,
    width: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.heading,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  details: {
    width: '100%',
    maxHeight: 200,
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.attachmentRowSurface,
  },
  detailsContent: {
    padding: 14,
    gap: 8,
  },
  detailHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.heading,
  },
  detailHeadingSpaced: {
    marginTop: 4,
  },
  detailText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  detailBullet: {
    flexDirection: 'row',
    gap: 8,
  },
  detailDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: colors.primary,
  },
  detailBulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textBody,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.heading,
  },
});
