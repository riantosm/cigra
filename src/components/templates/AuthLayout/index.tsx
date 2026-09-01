import { forwardRef } from 'react';
import type { ComponentRef, PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthBackground from '@/components/atoms/AuthBackground';
import { colors } from '@/theme/colors';
import { authEnterTransition } from '@/utils/motion';

export interface AuthLayoutProps extends PropsWithChildren {
  /** Center the form vertically (ChangePassword) instead of top-aligning it (Login, ForgotPassword). */
  centered?: boolean;
  /** Show the Login-only mountain silhouette in the backdrop. */
  showMountains?: boolean;
  /** Pinned to the bottom edge, above the backdrop — used for the Login version string. */
  footer?: ReactNode;
}

// Non-centered screens vertically center the form but bias it upward: a small fixed top inset plus a
// height-proportional bottom inset. On a short phone the form sits just below the top; on a tall
// phone / tablet it settles a little above the middle instead of drifting to dead center.
const TOP_INSET = 28;
const BOTTOM_BIAS_RATIO = 0.18;

const AuthLayout = forwardRef<ComponentRef<typeof ScrollView>, AuthLayoutProps>(
  function AuthLayoutInner(props, ref) {
    const { children, centered = false, showMountains = false, footer } = props;
    const { height } = useWindowDimensions();
    const bottomBias = Math.round(height * BOTTOM_BIAS_RATIO);

    return (
      <View style={styles.root}>
        <AuthBackground showMountains={showMountains} />
        <SafeAreaView style={styles.flex}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex}>
            <ScrollView
              ref={ref}
              contentContainerStyle={[
                styles.content,
                centered
                  ? styles.contentCentered
                  : { paddingTop: TOP_INSET, paddingBottom: bottomBias },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <MotiView
                from={{ opacity: 0, translateY: 24 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={authEnterTransition}>
                {children}
              </MotiView>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    );
  },
);

export default AuthLayout;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.authGradientStart,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  contentCentered: {
    paddingVertical: 32,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
});
