import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import QRCodeSvg from 'react-native-qrcode-svg';

import { colors } from '@/theme/colors';

export interface QrCodeProps {
  // Isi yang di-encode ke QR. Untuk Kartu Anggota ini adalah NRP (service_number).
  value: string | null | undefined;
  size?: number;
  // Warna modul QR — default text (nyaris hitam) supaya kontras & mudah dipindai.
  color?: string;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

// Pembungkus tipis di atas `react-native-qrcode-svg` (murni JS, jalan di atas react-native-svg yang
// sudah terpasang — tidak perlu rebuild native). Menangani kasus value kosong dengan placeholder,
// bukan crash, karena datanya bisa saja belum termuat saat render pertama.
export default function QrCode(props: QrCodeProps) {
  const { value, size = 132, color = colors.text, backgroundColor = colors.surface, style } = props;
  const trimmed = value?.trim();

  if (!trimmed) {
    return (
      <View style={[styles.placeholder, { height: size, width: size }, style]}>
        <Text style={styles.placeholderText}>QR belum tersedia</Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <QRCodeSvg value={trimmed} size={size} color={color} backgroundColor={backgroundColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.neutralSurface,
    padding: 8,
  },
  placeholderText: {
    fontSize: 11,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
