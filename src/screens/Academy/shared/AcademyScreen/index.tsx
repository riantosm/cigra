import type { ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import GradientButton from '@/components/atoms/GradientButton';
import MainLayout from '@/components/templates/MainLayout';
import { colors } from '@/theme/colors';

export interface AcademyScreenProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Footer yang di-pin di bawah (mis. tombol CTA). */
  footer?: ReactNode;
  contentStyle?: object;
  children: ReactNode;
}

// Scaffold layar DETAIL / stack Smart Academy: header canvas `[← judul]` + ScrollView + state
// loading/error/refresh. (Layar TAB pakai `AcademyTabScreen` yang tanpa header.)
export default function AcademyScreen(props: AcademyScreenProps) {
  const {
    title,
    subtitle,
    onBack,
    right,
    loading,
    error,
    onRetry,
    onRefresh,
    refreshing,
    footer,
    contentStyle,
    children,
  } = props;

  return (
    <MainLayout title={title} subtitle={subtitle} variant="canvas" onBack={onBack} right={right}>
      <View style={styles.flex}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            {onRetry ? (
              <GradientButton label="Coba Lagi" height={48} onPress={onRetry} style={styles.retry} />
            ) : null}
          </View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={!!refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              ) : undefined
            }>
            {children}
          </ScrollView>
        )}
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32, gap: 14 },
  errorBox: { paddingHorizontal: 24, paddingTop: 48, alignItems: 'center', gap: 16 },
  errorText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  retry: { alignSelf: 'stretch' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: colors.floatingSurface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
});
