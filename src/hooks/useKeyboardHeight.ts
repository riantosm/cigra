import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Tinggi keyboard saat ini (0 kalau tertutup). Dipakai untuk menaikkan konten/tombol di atas
// keyboard secara manual — `KeyboardAvoidingView` tidak andal di Android dengan mode edge-to-edge
// (RN 0.87, `edgeToEdgeEnabled=true`): `windowSoftInputMode=adjustResize` diabaikan sistem dan
// `behavior="padding"/"height"` tidak selalu mengangkat konten.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, event => {
      setHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
