import type { PropsWithChildren, ReactNode } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { MotiView } from 'moti';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import NavBar from '@/components/organisms/NavBar';
import { colors } from '@/theme/colors';
import { screenEnterTransition } from '@/utils/motion';

export interface MainLayoutProps extends PropsWithChildren {
  title: string;
  right?: ReactNode;
}

export default function MainLayout(props: MainLayoutProps) {
  const { title, right, children } = props;
  const isFocused = useIsFocused();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <NavBar title={title} right={right} />
      <MotiView
        key={isFocused ? 'focused' : 'blurred'}
        from={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={screenEnterTransition}
        style={styles.content}>
        {children}
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
