import type { ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import GradientButton from '@/components/atoms/GradientButton';
import { colors } from '@/theme/colors';

export interface AcademyTabScreenProps {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  footer?: ReactNode;
  contentStyle?: object;
  children: ReactNode;
}

// Isi layar TAB Smart Academy — TANPA header (chrome "Smart Academy" + tab bar disediakan
// `AcademyTabNavigator`). Hanya ScrollView + state loading/error/refresh + footer opsional.
export default function AcademyTabScreen(props: AcademyTabScreenProps) {
  const { loading, error, onRetry, onRefresh, refreshing, footer, contentStyle, children } = props;

  return (
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
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 14 },
  errorBox: { paddingHorizontal: 24, paddingTop: 48, alignItems: 'center', gap: 16 },
  errorText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  retry: { alignSelf: 'stretch' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.floatingSurface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
});
