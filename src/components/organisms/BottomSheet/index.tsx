import { useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Animated, Dimensions, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

export interface BottomSheetProps extends PropsWithChildren {
  visible: boolean;
  onRequestClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CLOSE_DURATION_MS = 220;
const DRAG_DISMISS_DISTANCE = 120;
const DRAG_DISMISS_VELOCITY = 0.8;

// Primitif bottom sheet bersama (dipakai QuickActionSheet, FilterSheet, dst) — Modal
// `animationType="none"` sengaja dipakai karena animasi masuk/keluarnya (slide asli dari luar
// layar, bukan fade) dan gesture drag-to-dismiss-nya di-drive manual lewat Animated di sini,
// bukan lewat transisi bawaan Modal. Pakai PanResponder + Animated (bukan reanimated/gesture-
// handler) karena keduanya API inti React Native — tidak perlu tambah dependency native baru.
export default function BottomSheet(props: BottomSheetProps) {
  const { visible, onRequestClose, children } = props;
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [isModalVisible, setIsModalVisible] = useState(visible);

  function animateOpen() {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 22,
      stiffness: 220,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }

  function animateClose(after?: () => void) {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: CLOSE_DURATION_MS,
      useNativeDriver: true,
    }).start(() => {
      setIsModalVisible(false);
      after?.();
    });
  }

  useEffect(() => {
    if (visible) {
      setIsModalVisible(true);
    } else {
      setIsModalVisible(current => {
        if (current) animateClose();
        return current;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Klaim responder langsung begitu disentuh (bukan nunggu ada pergerakan dulu) — di build RN
        // ini, klaim yang baru terjadi di fase "move" (onMoveShouldSetPanResponder) ternyata tidak
        // pernah dipanggil sama sekali kalau fase "start" tidak ada yang klaim, jadi drag-nya harus
        // diklaim dari awal sentuhan, baru tap-vs-drag dibedakan lewat jarak dy pas dilepas.
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_event, gesture) => {
          if (gesture.dy > 0) translateY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy > DRAG_DISMISS_DISTANCE || gesture.vy > DRAG_DISMISS_VELOCITY) {
            animateClose(onRequestClose);
          } else {
            animateOpen();
          }
        },
        onPanResponderTerminationRequest: () => false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onRequestClose],
  );

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, SCREEN_HEIGHT],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      onShow={animateOpen}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => animateClose(onRequestClose)} />
        </Animated.View>
        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY }] }]}>
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: colors.overlay,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    paddingTop: 4,
    paddingHorizontal: 20,
  },
  handleArea: {
    paddingVertical: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
});
