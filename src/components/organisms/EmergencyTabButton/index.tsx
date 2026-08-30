import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import StatusModal from '@/components/organisms/StatusModal';
import { usePanicButton } from '@/hooks/usePanicButton';
import { ROUTES } from '@/navigation/paths';
import type { MainTabScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { triggerHapticFeedback } from '@/utils/haptics';

const TAPS_REQUIRED = 3;
const TAP_WINDOW_MS = 1200;

export interface EmergencyTabButtonProps extends BottomTabBarButtonProps {
  // Reports the current "ketuk N kali lagi" message (or null to hide it) so the caller can render
  // it outside this button's tree — see MainTabNavigator for why.
  onToastChange: (message: string | null) => void;
}

// The first tap of a fresh sequence always opens the Emergency screen (normal tab navigation), so
// the page is always reachable. That same tap also counts toward a quick-submit shortcut: three
// taps close together (whether or not the screen is actually open yet) sends the panic signal
// directly, skipping the screen's own confirmation button. It's not ToastAndroid: Android's
// native Toast queues successive show() calls instead of replacing the visible one, so a fast
// second tap would still show the stale "N+1" message for its full duration — driving the message
// from a callback lets each tap overwrite it immediately.
export default function EmergencyTabButton({ onToastChange }: EmergencyTabButtonProps) {
  const navigation = useNavigation<MainTabScreenProps<'Emergency'>['navigation']>();
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
      navigation.navigate(ROUTES.emergency);
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
        onPress={handlePress}
        style={styles.wrapper}
        contentStyle={styles.button}>
        <Icon name="emergency" size={30} color={colors.dangerForeground} />
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    height: 60,
    width: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
