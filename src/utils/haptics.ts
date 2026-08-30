import { Vibration } from 'react-native';

// No haptics library is installed, so this leans on the core Vibration API instead of adding a
// native dependency. iOS ignores the duration argument (always the same short system buzz);
// Android honors it — 60ms is chosen to read as a firm, clearly-felt tap without dragging into a
// long buzz.
export function triggerHapticFeedback(): void {
  Vibration.vibrate(60);
}
