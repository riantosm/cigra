import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useSecondsTick } from '@/hooks/useSecondsTick';
import { colors } from '@/theme/colors';
import type { LocationStatus } from '@/types';
import { formatRelativeTime } from '@/utils/format';

// Satu sumber kebenaran untuk label + warna status lokasi di SELURUH app (tab Lokasi personel &
// persit, daftar Lokasi Personel, kartu "Posisi Saya" di Profile).
export const locationStatusMeta: Record<LocationStatus, { label: string; color: string; surface: string }> = {
  fresh: { label: 'Fresh', color: colors.success, surface: colors.successSurface },
  stale: { label: 'Stale', color: colors.warning, surface: colors.warningSurface },
  offline: { label: 'Belum Ada Data', color: colors.textMuted, surface: colors.neutralSurface },
};

export interface LocationStatusBadgeProps {
  status: LocationStatus;
  // Waktu fix terakhir (location.captured_at / last_seen). Untuk fresh/stale ditampilkan sebagai
  // "(x detik lalu)" yang ter-update tiap detik. Diabaikan untuk offline.
  timestamp?: string | null;
  style?: StyleProp<ViewStyle>;
}

export default function LocationStatusBadge(props: LocationStatusBadgeProps) {
  const { status, timestamp, style } = props;
  // Re-render tiap detik supaya "(x detik lalu)" hidup.
  useSecondsTick();

  const meta = locationStatusMeta[status];
  const relative = status === 'offline' ? null : formatRelativeTime(timestamp);
  const label = relative ? `${meta.label} (${relative})` : meta.label;

  return (
    <View style={[styles.pill, { backgroundColor: meta.surface }, style]}>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.label, { color: meta.color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
