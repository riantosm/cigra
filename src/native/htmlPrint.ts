import { NativeModules, Platform } from 'react-native';

interface HtmlPrintNativeModule {
  // Buka dialog cetak sistem (Android PrintManager) untuk HTML ini — pengguna bisa memilih
  // "Simpan sebagai PDF". Resolve begitu dialog dibuka. `landscape` = kertas A4 mendatar.
  printHtml(html: string, jobName: string, landscape: boolean): Promise<void>;
}

// `null` di iOS / build lama yang belum memuat modul (butuh rebuild native) — pemanggil fallback.
export const htmlPrint: HtmlPrintNativeModule | null =
  Platform.OS === 'android' ? (NativeModules.HtmlPrintModule ?? null) : null;
