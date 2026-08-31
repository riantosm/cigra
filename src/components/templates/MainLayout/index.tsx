import type { PropsWithChildren, ReactNode } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { MotiView } from 'moti';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenBackground from '@/components/atoms/ScreenBackground';
import NavBar from '@/components/organisms/NavBar';
import { colors } from '@/theme/colors';
import { screenEnterTransition } from '@/utils/motion';

export interface MainLayoutProps extends PropsWithChildren {
  title: string;
  /** Shown under the title in the `canvas` variant only. */
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  /**
   * `'plain'` (default) keeps the white nav-bar look. `'canvas'` renders the gradient backdrop
   * + borderless big-title header (DESIGN_SYSTEM.md §1b/§5.1). New screens opt in.
   */
  variant?: 'plain' | 'canvas';
}

export default function MainLayout(props: MainLayoutProps) {
  const { title, subtitle, right, onBack, children, variant = 'plain' } = props;
  const isFocused = useIsFocused();
  const isCanvas = variant === 'canvas';

  return (
    <SafeAreaView
      style={[styles.container, isCanvas && styles.containerCanvas]}
      edges={['top', 'left', 'right']}>
      {isCanvas ? <ScreenBackground /> : null}
      <NavBar
        title={title}
        subtitle={subtitle}
        right={right}
        onBack={onBack}
        variant={variant}
      />
      <MotiView
        key={isFocused ? 'focused' : 'blurred'}
        from={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={screenEnterTransition}
        style={[styles.content, isCanvas && styles.contentCanvas]}>
        {children}
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  containerCanvas: {
    backgroundColor: colors.pageGradientStart,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentCanvas: {
    backgroundColor: 'transparent',
  },
});
