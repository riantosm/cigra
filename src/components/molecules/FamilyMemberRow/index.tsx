import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import PersonAvatar from '@/components/molecules/PersonAvatar';
import { colors } from '@/theme/colors';

export interface FamilyMemberRowProps {
  name: string;
  photo: string | null;
  subtitle?: string;
  onPress: () => void;
  // Diteruskan ke Pressable terluar — pemanggil yang mengurus pemisah/divider antar baris
  // (mis. `borderBottomWidth`), komponen ini tidak menggambarnya sendiri.
  style?: StyleProp<ViewStyle>;
}

// Baris anggota keluarga (Persit) — dipakai di MemberHome & Profile. Tap → detail Persit.
// `photo` biasanya placeholder SVG (data URI) → `PersonAvatar` jatuh ke avatar inisial.
export default function FamilyMemberRow(props: FamilyMemberRowProps) {
  const { name, photo, subtitle, onPress, style } = props;
  return (
    <PressableScale
      scaleTo={0.98}
      style={style}
      contentStyle={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Buka detail ${name}`}>
      <PersonAvatar photo={photo} name={name} size={44} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={18} color={colors.placeholder} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
