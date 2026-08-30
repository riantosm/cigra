import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/navigation/tabBar';

const EXTRA_BOTTOM_SPACING = 48;

// Tab bar-nya `position: absolute` (lihat MainTabNavigator) sehingga menutupi konten di
// bawahnya alih-alih mendorongnya — tiap layar tab harus menambah padding bawah sebesar tinggi
// tab bar (termasuk safe-area device) plus sedikit jarak napas ekstra.
export function useTabScreenBottomPadding(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + EXTRA_BOTTOM_SPACING;
}
