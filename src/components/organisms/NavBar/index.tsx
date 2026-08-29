import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { logo } from '@/assets';
import Icon from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export interface NavBarProps {
  title: string;
  right?: ReactNode;
  onBack?: () => void;
}

export default function NavBar(props: NavBarProps) {
  const { title, right, onBack } = props;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Kembali">
            <Icon name="arrow-left" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.logoBadge}>
            <Image source={logo.LogoIcon} style={styles.logoImage} resizeMode="contain" />
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
});
