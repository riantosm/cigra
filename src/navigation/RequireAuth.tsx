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
  // Dipakai oleh AppBootstrap sendiri — tanpa ini, RequireAuth akan me-replace layar itu ke
  // dirinya sendiri selama appChecked masih false.
  skipAppCheckGate?: boolean;
}

export default function RequireAuth(props: RequireAuthProps) {
  const isLogin = useAppSelector(state => state.auth.isLogin);
  const requiresPasswordChange = useAppSelector(state => state.auth.requiresPasswordChange);
  const appChecked = useAppSelector(state => state.auth.appChecked);
  const blockedByPasswordChange = !props.skipPasswordChangeGate && requiresPasswordChange;
  // Ganti password selalu didahulukan; pakai flag mentah `requiresPasswordChange` (bukan yang
  // sudah di-gate) supaya layar ChangePassword tidak ikut ke-redirect ke AppBootstrap.
  const blockedByAppCheck = !props.skipAppCheckGate && !requiresPasswordChange && !appChecked;

  useEffect(() => {
    if (!isLogin) {
      props.navigation.replace(ROUTES.login);
    } else if (blockedByPasswordChange) {
      props.navigation.replace(ROUTES.changePassword);
    } else if (blockedByAppCheck) {
      props.navigation.replace(ROUTES.appBootstrap);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin, blockedByPasswordChange, blockedByAppCheck]);

  if (!isLogin || blockedByPasswordChange || blockedByAppCheck) {
    return null;
  }

  return props.children;
}
