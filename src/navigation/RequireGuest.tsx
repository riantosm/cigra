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

  useEffect(() => {
    if (isLogin) {
      props.navigation.replace(ROUTES.main);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin]);

  if (isLogin) {
    return null;
  }

  return props.children;
}
