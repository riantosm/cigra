import { View } from 'react-native';

// Slot tab "Academy" di bar utama. Tidak pernah tampil: `CustomTabBar` menahan tap-nya dan
// mem-push root-stack `AcademyRoot` (bottom-tab navigator Academy sendiri) alih-alih pindah tab.
// Lihat `src/navigation/AcademyTabNavigator.tsx`.
export default function AcademyScreen() {
  return <View />;
}
