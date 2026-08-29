import { useCallback, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const EXIT_CONFIRM_WINDOW_MS = 2000;

// Pola umum Android: tekan back pertama menampilkan toast, tekan kedua dalam jeda singkat baru
// benar-benar keluar — mencegah keluar tidak sengaja dari layar root (Home/Login) yang tidak
// punya riwayat navigasi untuk di-back. iOS tidak punya hardware back button, jadi no-op di sana.
export function useDoubleBackToExit(message = 'Tekan sekali lagi untuk keluar'): void {
  const lastPressRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;

      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        const now = Date.now();
        if (now - lastPressRef.current < EXIT_CONFIRM_WINDOW_MS) {
          BackHandler.exitApp();
          return true;
        }
        lastPressRef.current = now;
        ToastAndroid.show(message, ToastAndroid.SHORT);
        return true;
      });

      return () => subscription.remove();
    }, [message]),
  );
}
