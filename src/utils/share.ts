import { Linking, Share } from 'react-native';

// Kirim teks ke WhatsApp: buka aplikasi WhatsApp dengan teks sudah terisi (pengguna memilih kontak /
// grup sendiri). Kalau WhatsApp tidak terpasang / skema `whatsapp://` tidak bisa dibuka, jatuh ke
// share sheet sistem supaya teks tetap bisa dikirim. Tanpa dependency native tambahan.
export async function sendTextToWhatsApp(text: string): Promise<'whatsapp' | 'share'> {
  try {
    await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`);
    return 'whatsapp';
  } catch {
    await Share.share({ message: text });
    return 'share';
  }
}

// Share sheet sistem (WhatsApp, Telegram, email, dll.).
export async function shareText(text: string, title?: string): Promise<void> {
  await Share.share(title ? { message: text, title } : { message: text });
}
