import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import StatusModal from '@/components/organisms/StatusModal';
import { usePanicButton } from '@/hooks/usePanicButton';
import { colors } from '@/theme/colors';
import { triggerHapticFeedback } from '@/utils/haptics';

const TAPS_REQUIRED = 3;
const TAP_WINDOW_MS = 1200;

export interface EmergencyTabButtonProps {
  // Reports the current "ketuk N kali lagi" message (or null to hide it) so the caller can render
  // it outside this button's tree — see MainTabNavigator for why.
  onToastChange: (message: string | null) => void;
  // Opens the Emergency screen. Passed from CustomTabBar (which has the tab navigator's `navigation`
  // via its render-prop) rather than calling `useNavigation()` here — inside a `tabBar` render prop
  // that hook doesn't resolve to the tab navigator.
  onOpenEmergencyScreen: () => void;
}

// The first tap of a fresh sequence always opens the Emergency screen (normal tab navigation), so
// the page is always reachable. That same tap also counts toward a quick-submit shortcut: three
// taps close together (whether or not the screen is actually open yet) sends the panic signal
// directly, skipping the screen's own confirmation button. It's not ToastAndroid: Android's
// native Toast queues successive show() calls instead of replacing the visible one, so a fast
// second tap would still show the stale "N+1" message for its full duration — driving the message
// from a callback lets each tap overwrite it immediately.
export default function EmergencyTabButton({ onToastChange, onOpenEmergencyScreen }: EmergencyTabButtonProps) {
  const { isSending, modal, closeModal, sendPanicSignal } = usePanicButton();
  const tapTimestamps = useRef<number[]>([]);
  const hideToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideToastTimeout.current) clearTimeout(hideToastTimeout.current);
    };
  }, []);

  function handlePress() {
    if (isSending) return;
    triggerHapticFeedback();
    const now = Date.now();
    const recentTaps = [...tapTimestamps.current, now].filter(timestamp => now - timestamp <= TAP_WINDOW_MS);
    const isFreshSequence = recentTaps.length === 1;

    if (hideToastTimeout.current) clearTimeout(hideToastTimeout.current);

    if (isFreshSequence) {
      onOpenEmergencyScreen();
    }

    if (recentTaps.length >= TAPS_REQUIRED) {
      tapTimestamps.current = [];
      onToastChange(null);
      sendPanicSignal();
      return;
    }

    tapTimestamps.current = recentTaps;
    const remaining = TAPS_REQUIRED - recentTaps.length;
    onToastChange(`Ketuk ${remaining} kali lagi untuk kirim sinyal darurat`);
    hideToastTimeout.current = setTimeout(() => onToastChange(null), TAP_WINDOW_MS);
  }

  return (
    <>
      <PressableScale
        scaleTo={0.94}
        accessibilityRole="button"
        accessibilityLabel="Emergency"
        disabled={isSending}
        onPress={handlePress}
        style={styles.wrapper}
        contentStyle={styles.button}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="emergencyTab" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.gradientDangerStart} />
              <Stop offset="1" stopColor={colors.danger} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={28} ry={28} fill="url(#emergencyTab)" />
        </Svg>
        {isSending ? (
          <ActivityIndicator color={colors.dangerForeground} />
        ) : (
          <Icon name="emergency" size={26} color={colors.dangerForeground} />
        )}
      </PressableScale>

      <StatusModal
        visible={modal.visible}
        variant={modal.variant}
        title={modal.title}
        message={modal.message}
        onRequestClose={closeModal}
        primaryAction={modal.primaryAction}
        secondaryAction={
          modal.secondaryAction
            ? {
                ...modal.secondaryAction,
                onPress: () => {
                  closeModal();
                  modal.secondaryAction?.onPress();
                },
              }
            : undefined
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    height: 56,
    width: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    // Warna solid = shape opaque buat iOS mengecor bayangan dari balik SVG-nya.
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOpacity: 0.42,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
});
