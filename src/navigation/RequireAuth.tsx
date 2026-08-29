import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ROUTES } from '@/navigation/paths';
import type { RootStackParamList } from '@/navigation/types';
import { useAppSelector } from '@/store/hooks';

export interface RequireAuthProps extends PropsWithChildren {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  // Dipakai oleh ChangePassword sendiri — tanpa ini, RequireAuth akan terus me-replace ke
  // ChangePassword selama requiresPasswordChange masih true, termasuk saat layar itu sendiri
  // yang sedang dirender.
  skipPasswordChangeGate?: boolean;
}

export default function RequireAuth(props: RequireAuthProps) {
  const isLogin = useAppSelector(state => state.auth.isLogin);
  const requiresPasswordChange = useAppSelector(state => state.auth.requiresPasswordChange);
  const blockedByPasswordChange = !props.skipPasswordChangeGate && requiresPasswordChange;

  useEffect(() => {
    if (!isLogin) {
      props.navigation.replace(ROUTES.login);
    } else if (blockedByPasswordChange) {
      props.navigation.replace(ROUTES.changePassword);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin, blockedByPasswordChange]);

  if (!isLogin || blockedByPasswordChange) {
    return null;
  }

  return props.children;
}
