import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import StatusModal from '@/components/organisms/StatusModal';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { usePanicButton } from '@/hooks/usePanicButton';
import { colors } from '@/theme/colors';
import { triggerHapticFeedback } from '@/utils/haptics';
import { contentEnterTransition, radarRingTransition } from '@/utils/motion';

// Staggered so a new ring starts its outward ping while the previous one is still fading —
// otherwise all three would pulse in lockstep instead of reading as a continuous radar sweep.
// Hoisted to module scope (not built inline in JSX) so the objects keep a stable identity across
// re-renders — e.g. isSending flipping while a signal is sending. A fresh `transition` object on
// every render made moti treat the loop as a brand new animation and restart it from scratch,
// which read as the rings suddenly jumping/resetting instead of pulsing continuously.
const RING_FROM = { scale: 1, opacity: 0.5 };
const RING_ANIMATE = { scale: 2.4, opacity: 0 };
const RING_PULSES = [0, 800, 1600].map(delay => ({ delay, transition: radarRingTransition(delay) }));

// No header on this screen (unlike other tab screens) — it's meant to read as a single focused
// action, matching the reference design. Reachable via the bottom tab's EmergencyTabButton, which
// also has its own quick-submit shortcut (triple tap); this screen's button is the deliberate,
// single-tap path since opening the screen is already an intentional step.
export default function EmergencyScreen() {
  const { isSending, modal, closeModal, sendPanicSignal } = usePanicButton();
  const bottomPadding = useTabScreenBottomPadding();

  function handlePress() {
    if (isSending) return;
    triggerHapticFeedback();
    sendPanicSignal();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>Kirim Sinyal</Text>

      <View style={[styles.content, { paddingBottom: bottomPadding }]}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={contentEnterTransition}
          style={styles.radarArea}>
          {RING_PULSES.map(ring => (
            <MotiView
              key={ring.delay}
              from={RING_FROM}
              animate={RING_ANIMATE}
              transition={ring.transition}
              style={styles.ring}
            />
          ))}

          <PressableScale
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel="Kirim Sinyal Darurat"
            disabled={isSending}
            onPress={handlePress}
            contentStyle={styles.centerButton}>
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="emergencySend" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={colors.gradientDangerStart} />
                  <Stop offset="1" stopColor={colors.danger} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" rx={48} ry={48} fill="url(#emergencySend)" />
            </Svg>
            <Icon name="emergency" size={40} color={colors.dangerForeground} />
          </PressableScale>
        </MotiView>

        <Text style={styles.subtitle}>
          Tekan tombol di tengah untuk <Text style={styles.subtitleEmphasis}>LANGSUNG</Text> mengirim sinyal
        </Text>
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.heading,
    textAlign: 'center',
    marginTop: 12,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 32,
  },
  radarArea: {
    height: 220,
    width: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    height: 100,
    width: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.dangerMuted,
  },
  centerButton: {
    height: 96,
    width: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  subtitleEmphasis: {
    fontWeight: '700',
    color: colors.heading,
  },
});
