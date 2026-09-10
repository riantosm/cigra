import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AcademyTabParamList, RootStackParamList } from '@/navigation/types';

// Navigation prop untuk layar-layar TAB Smart Academy: bisa pindah tab (AcademyTabParamList)
// **dan** push layar root-stack (ProgramDetail, Attempt, dst) — pola composite di CLAUDE.md.
export type AcademyTabNav = CompositeNavigationProp<
  BottomTabNavigationProp<AcademyTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;
