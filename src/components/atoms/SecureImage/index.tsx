import { useEffect, useState } from 'react';
import FastImage from 'react-native-fast-image';
import type { FastImageProps } from 'react-native-fast-image';

import { getAuthToken } from '@/services/api/axiosInstance';
import { useAppSelector } from '@/store/hooks';
import { isDisplayablePhoto, isProtectedApiUrl, resolveSecureFileUrl } from '@/utils/avatar';

export interface SecureImageProps extends Omit<FastImageProps, 'source'> {
  // Nilai mentah field `photo` dari API (path relatif, URL absolut, atau null).
  path: string | null | undefined;
  // Dipanggil kalau gambar gagal dimuat — pemanggil biasa memakainya untuk switch ke avatar inisial.
  onLoadError?: () => void;
}

// Foto di balik `<site>/api/secure-files/...` butuh header `Authorization: Bearer <token>`.
// `<Image>` bawaan RN mendukung `source.headers` di atas kertas, tapi Fresco (Android) meng-cache
// respons gambar berdasarkan URI saja dan mengabaikan header saat request pertama gagal/di-redirect —
// hasilnya request kedua dengan header yang benar tetap mengembalikan hasil basi (gagal decode: "unknown
// image format", karena body yang di-cache adalah halaman HTML redirect, bukan gambar). `react-native-fast-image`
// punya cache sendiri yang menghormati header, jadi dipakai di sini menggantikan `<Image>` bawaan RN.
//
// Token diambil live dari AsyncStorage (`getAuthToken`), bukan `state.auth.token` — token di redux
// hanya di-set saat login dan bisa basi setelah interceptor axios me-rotate token di background.
// `state.auth.token` tetap dipakai sebagai nilai awal supaya render pertama tidak kosong.
//
// Header Authorization hanya ditempelkan untuk URL di bawah host API kita (`isProtectedApiUrl`) —
// bukan untuk URL absolut pihak ketiga.
export default function SecureImage(props: SecureImageProps) {
  const { path, style, onLoadError, onError, ...rest } = props;
  const persistedToken = useAppSelector(state => state.auth.token);
  const [token, setToken] = useState<string | null>(persistedToken);

  useEffect(() => {
    let cancelled = false;
    getAuthToken().then(value => {
      if (!cancelled && value) setToken(value);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  // Pemanggil sudah menyaring dengan `isDisplayablePhoto`, tapi jaga-jaga di sini juga supaya URL
  // placeholder yang tidak bisa dirender tidak pernah dicoba.
  if (!isDisplayablePhoto(path)) return null;

  const uri = resolveSecureFileUrl(path);
  if (!uri) return null;

  const withAuth = Boolean(token) && isProtectedApiUrl(uri);

  return (
    <FastImage
      style={style}
      source={{
        uri,
        ...(withAuth ? { headers: { Authorization: `Bearer ${token}` } } : null),
        priority: FastImage.priority.normal,
      }}
      onError={() => {
        onLoadError?.();
        onError?.();
      }}
      {...rest}
    />
  );
}
