import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ROUTES } from '@/navigation/paths';
import type { RootStackParamList } from '@/navigation/types';
import { useAppSelector } from '@/store/hooks';

export interface RequireGuestProps extends PropsWithChildren {
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

export default function RequireGuest(props: RequireGuestProps) {
  const isLogin = useAppSelector(state => state.auth.isLogin);
  const requiresPasswordChange = useAppSelector(state => state.auth.requiresPasswordChange);
  const appChecked = useAppSelector(state => state.auth.appChecked);

  useEffect(() => {
    if (!isLogin) return;
    if (requiresPasswordChange) {
      props.navigation.replace(ROUTES.changePassword);
    } else if (!appChecked) {
      props.navigation.replace(ROUTES.appBootstrap);
    } else {
      props.navigation.replace(ROUTES.main);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin, requiresPasswordChange, appChecked]);

  if (isLogin) {
    return null;
  }

  return props.children;
}
