import { forwardRef, useState } from 'react';
import type { ComponentRef, ReactNode } from 'react';
import { Pressable } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { MotiView } from 'moti';

import { pressTransition } from '@/utils/motion';

export interface PressableScaleProps extends Omit<PressableProps, 'children'> {
  children?: ReactNode;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

// Primitif tunggal untuk animasi "tekan mengecil" — SEMUA elemen yang bisa ditekan (tombol, kartu,
// ikon, teks berlink) harus dibangun di atas ini, bukan Pressable polos, supaya animasinya otomatis
// konsisten di seluruh app. Lihat CLAUDE.md bagian "Interaksi & animasi tekan".
const PressableScale = forwardRef<ComponentRef<typeof Pressable>, PressableScaleProps>(
  function PressableScaleImpl(props, ref) {
    const { scaleTo = 0.96, style, contentStyle, children, onPressIn, onPressOut, ...rest } = props;
    const [pressed, setPressed] = useState(false);

    return (
      <Pressable
        ref={ref}
        onPressIn={event => {
          setPressed(true);
          onPressIn?.(event);
        }}
        onPressOut={event => {
          setPressed(false);
          onPressOut?.(event);
        }}
        style={style}
        {...rest}>
        <MotiView animate={{ scale: pressed ? scaleTo : 1 }} transition={pressTransition} style={contentStyle}>
          {children}
        </MotiView>
      </Pressable>
    );
  },
);

export default PressableScale;
