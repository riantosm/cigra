import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { authEnterTransition } from '@/utils/motion';

export type AuthLayoutProps = PropsWithChildren;

export default function AuthLayout(props: AuthLayoutProps) {
  const { children } = props;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={styles.content}>
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={authEnterTransition}>
            {children}
          </MotiView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
