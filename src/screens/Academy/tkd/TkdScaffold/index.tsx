import type { ReactNode } from 'react';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import ScreenBackground from '@/components/atoms/ScreenBackground';
import { colors } from '@/theme/colors';
import { tabBarShadow } from '@/theme/shadows';

export interface TkdScaffoldProps {
  title: string;
  onBack?: () => void;
  /** Glyph tombol kiri — 'arrow-left' (default) atau 'close' (layar Navigasi Soal). */
  backIcon?: 'arrow-left' | 'close';
  /** Node di kanan header (mis. chip timer). */
  headerRight?: ReactNode;
  /** Footer yang dipin di bawah (tombol aksi). */
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

// Shell umum untuk semua layar alur TKD (artboard "Academy — Akademik"): latar gradient +
// header ringan `[← Judul  (kanan)]` (16/700, tanpa kartu/border) + isi + footer PINNED (absolut)
// opsional. Footer diukur (onLayout) supaya konten di ScrollView diberi padding bawah pas — bukan
// mengandalkan flexbox yang sempat menggeser footer keluar layar.
export default function TkdScaffold(props: TkdScaffoldProps) {
  const {
    title,
    onBack,
    backIcon = 'arrow-left',
    headerRight,
    footer,
    scroll = true,
    contentStyle,
    children,
  } = props;
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);

  const onFooterLayout = (e: LayoutChangeEvent) => setFooterHeight(e.nativeEvent.layout.height);
  const bottomPad = footer ? footerHeight + 16 : 24;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenBackground />

      <View style={styles.header}>
        {onBack ? (
          <PressableScale
            onPress={onBack}
            contentStyle={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Kembali">
            <Icon name={backIcon} size={22} color={colors.heading} />
          </PressableScale>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
      </View>

      {scroll ? (
        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }, contentStyle]}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.plainContent, { paddingBottom: bottomPad }, contentStyle]}>
          {children}
        </View>
      )}

      {footer ? (
        <View
          onLayout={onFooterLayout}
          style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageGradientStart,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.heading,
  },
  headerRight: {
    flexShrink: 0,
  },
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  plainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
});
