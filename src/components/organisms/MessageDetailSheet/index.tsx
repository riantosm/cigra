import { ScrollView, StyleSheet, Text, View } from 'react-native';

import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import BottomSheet from '@/components/organisms/BottomSheet';
import { colors } from '@/theme/colors';

export interface MessageDetailSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  icon: IconName;
  iconColor: string;
  iconSurface: string;
  title: string;
  body: string;
  /** Baris meta di bawah judul (pengirim, waktu, dst) — yang kosong diabaikan. */
  metaLines?: (string | null | undefined)[];
  /** Tombol aksi opsional (mis. "Buka" untuk notifikasi bertaut). */
  action?: { label: string; onPress: () => void };
}

// Sheet baca-penuh untuk baris notifikasi / pengumuman yang di list dipangkas jadi 1-2 baris.
// Tidak ada endpoint detail — semua teks diambil dari data list yang sudah ada.
export default function MessageDetailSheet(props: MessageDetailSheetProps) {
  const { visible, onRequestClose, icon, iconColor, iconSurface, title, body, metaLines, action } = props;
  const metas = (metaLines ?? []).filter((line): line is string => Boolean(line && line.trim().length > 0));

  return (
    <BottomSheet visible={visible} onRequestClose={onRequestClose}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: iconSurface }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      {metas.length > 0 ? (
        <View style={styles.metaGroup}>
          {metas.map(line => (
            <Text key={line} style={styles.meta}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.body}>{body}</Text>
      </ScrollView>

      {action ? (
        <GradientButton label={action.label} onPress={action.onPress} height={52} style={styles.action} />
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  iconCircle: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.heading,
  },
  metaGroup: {
    marginTop: 12,
    gap: 2,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  bodyScroll: {
    marginTop: 14,
    maxHeight: 320,
  },
  bodyContent: {
    paddingBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  action: {
    marginTop: 16,
  },
});
