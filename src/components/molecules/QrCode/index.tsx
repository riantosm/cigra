import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { buildIdentityQrUrl } from '@/utils/qr';

export interface QrCodeProps {
  // Isi yang di-encode ke QR — untuk Kartu Anggota ini NRP (service_number).
  value: string | null | undefined;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

// QR Kartu Anggota. Gambarnya dari layanan generator (`utils/qr.ts` → qr.sakaraguna.com) supaya
// logo satuan bisa disematkan di tengah kode — bukan lagi di-encode di device. Value kosong /
// gagal muat → placeholder, bukan crash (data bisa belum termuat saat render pertama).
export default function QrCode(props: QrCodeProps) {
  const { value, size = 132, style } = props;
  const trimmed = value?.trim();
  const [failed, setFailed] = useState(false);

  if (!trimmed || failed) {
    return (
      <View style={[styles.placeholder, { height: size, width: size }, style]}>
        <Text style={styles.placeholderText}>
          {failed ? 'QR gagal dimuat' : 'QR belum tersedia'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[{ height: size, width: size }, style]}>
      <Image
        source={{ uri: buildIdentityQrUrl(trimmed) }}
        style={styles.image}
        resizeMode="contain"
        onError={() => setFailed(true)}
        accessibilityRole="image"
        accessibilityLabel="QR identitas anggota"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    height: '100%',
    width: '100%',
    backgroundColor: colors.surface,
  },
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
