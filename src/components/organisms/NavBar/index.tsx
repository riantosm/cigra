import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { logo } from '@/assets';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { smallButtonShadow } from '@/theme/shadows';

export type NavBarVariant = 'plain' | 'canvas';

export interface NavBarProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  variant?: NavBarVariant;
}

export default function NavBar(props: NavBarProps) {
  const { title, subtitle, right, onBack, variant = 'plain' } = props;
  const isCanvas = variant === 'canvas';

  return (
    <View style={[styles.container, isCanvas && styles.containerCanvas]}>
      <View style={styles.left}>
        {onBack ? (
          <PressableScale
            onPress={onBack}
            hitSlop={12}
            contentStyle={isCanvas ? styles.backButtonCanvas : styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Kembali">
            <Icon name="arrow-left" size={22} color={colors.heading} />
          </PressableScale>
        ) : (
          <View style={styles.logoBadge}>
            <Image source={logo.LogoIcon} style={styles.logoImage} resizeMode="contain" />
          </View>
        )}
        <View style={styles.titleGroup}>
          <Text style={isCanvas ? styles.titleCanvas : styles.title} numberOfLines={1}>
            {title}
          </Text>
          {isCanvas && subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
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
  // Canvas header: no nav-bar background/border, sits on the gradient. Taller to fit the subtitle.
  containerCanvas: {
    height: undefined,
    alignItems: 'flex-start',
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    paddingTop: 20,
    paddingBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  titleGroup: {
    flex: 1,
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
  backButtonCanvas: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...smallButtonShadow,
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
  titleCanvas: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.heading,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
  },
});
