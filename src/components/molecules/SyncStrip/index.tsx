import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';

export interface SyncStripProps {
  // Jam sinkron terakhir, mis. "08:14".
  syncedLabel: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Strip "Sistem terhubung / Terakhir sinkron" (DESIGN_SYSTEM.md §5.12) — dipakai sama persis di
// ketiga Home (Commander / Member / HealthOfficer). Menekan strip men-trigger refresh yang sama
// dengan pull-to-refresh layar.
export default function SyncStrip(props: SyncStripProps) {
  const { syncedLabel, onPress, style } = props;

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      disabled={!onPress}
      style={style}
      contentStyle={styles.row}>
      <View style={styles.left}>
        <View style={styles.dotHalo}>
          <View style={styles.dot} />
        </View>
        <Text style={styles.label}>Sistem terhubung</Text>
      </View>
      <View style={styles.right}>
        <Icon name="refresh" size={13} color={colors.primary} />
        <Text style={styles.label} numberOfLines={1}>
          Terakhir sinkron: {syncedLabel}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotHalo: {
    height: 14,
    width: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.success}2E`,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
